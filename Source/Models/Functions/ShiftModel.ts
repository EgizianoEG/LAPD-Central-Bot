import { CallbackWithoutResultAndOptionalError, Query } from "mongoose";
import { ActiveShiftsCache } from "@Utilities/Other/Cache.js";
import { Shifts } from "@Typings/Utilities/Database.js";
import ProfileModel from "@Models/GuildProfile.js";
import AppError from "@Utilities/Classes/AppError.js";

const ErrorTitle = "Invalid Action";
type ThisType = Shifts.HydratedShiftDocument;

async function GetUpdatedDocument<GOIFailed extends boolean = false>(
  Document: ThisType,
  OldFallback: GOIFailed,
  Silent: boolean = true
): Promise<GOIFailed extends true ? ThisType : ThisType | null> {
  return (Document.constructor as any)
    .findOne({ _id: Document._id })
    .then((Latest: Nullable<ThisType>) => {
      if (OldFallback) {
        return Latest ?? Document;
      }
      return Latest;
    })
    .catch((Err: any) => {
      if (Silent) {
        return null;
      }
      throw Err;
    });
}

export function HasBreakActive(this: ThisType) {
  return this.events.breaks.some(([, end]) => end === null);
}

export function HasBreaks(this: ThisType) {
  return this.events.breaks.length > 0;
}

export function ShiftEventAdd(this: ThisType, type: "arrests" | "citations") {
  this.events[type]++;
  return this.save();
}

export async function GetLatestVersion<GOIFailed extends boolean = false>(
  this: ThisType,
  OldFallback: GOIFailed,
  Silent: boolean = true
): Promise<GOIFailed extends true ? ThisType : ThisType | null> {
  return GetUpdatedDocument(this, OldFallback, Silent);
}

export async function ShiftBreakStart(this: ThisType, timestamp: number = Date.now()) {
  const DBDocument = await this.getLatestVersion(true, true);

  if (this.hasBreakActive()) {
    return Promise.reject(
      new AppError({
        title: ErrorTitle,
        message:
          "There is already an active break. Please end the current break before starting another.",
        showable: true,
      })
    );
  }

  DBDocument.events.breaks.push([timestamp, null]);
  return DBDocument.save();
}

export async function ShiftBreakEnd(this: ThisType, timestamp: number = Date.now()) {
  const DBDocument = await this.getLatestVersion(true, true);

  if (DBDocument.events.breaks.length) {
    const BreakActive = this.events.breaks.findIndex(([, end]) => end === null);
    if (BreakActive !== -1) {
      DBDocument.events.breaks[BreakActive][1] = timestamp;
      return DBDocument.save();
    }
  }

  return Promise.reject(
    new AppError({
      title: ErrorTitle,
      message: "There is no active break to end. Make sure to start a break before ending it.",
      showable: true,
    })
  );
}

export async function ShiftEnd(this: ThisType, timestamp: Date | number = new Date()) {
  const DBDocument = await this.getLatestVersion(true, true);

  if (DBDocument.end_timestamp)
    return Promise.reject(
      new AppError({
        title: ErrorTitle,
        message:
          "It appears that this shift has already ended. Make sure you start a new shift before you attempt to end it.",
        showable: true,
      })
    );
  else DBDocument.end_timestamp = new Date(timestamp);

  return DBDocument.save().then(async (ShiftDoc) => {
    ActiveShiftsCache.del(ShiftDoc._id);
    return ShiftDoc;
  });
}

export async function ResetShiftTime(this: ThisType, CurrentTimestamp: number = Date.now()) {
  const DBShiftDoc = await this.getLatestVersion(false, false);
  if (!DBShiftDoc) {
    throw new AppError({ template: "NoShiftFoundWithId", showable: true });
  }

  if (DBShiftDoc.durations.on_duty === 0) {
    throw new AppError({ template: "ShiftTimeAlreadyReset", showable: true });
  }

  DBShiftDoc.durations.on_duty_mod = -(
    (DBShiftDoc.end_timestamp?.valueOf() || CurrentTimestamp) - DBShiftDoc.start_timestamp.valueOf()
  );

  return DBShiftDoc.save();
}

export async function SetShiftTime(
  this: ThisType,
  Duration: number,
  CurrentTimestamp: number = Date.now()
) {
  const DBShiftDoc = await this.getLatestVersion(false, false);
  if (!DBShiftDoc) {
    throw new AppError({ template: "NoShiftFoundWithId", showable: true });
  }

  DBShiftDoc.durations.on_duty_mod = 0;
  DBShiftDoc.durations.on_duty_mod += Math.round(Math.max(Duration, 0));
  DBShiftDoc.durations.on_duty_mod -=
    (DBShiftDoc.end_timestamp?.valueOf() || CurrentTimestamp) -
    DBShiftDoc.start_timestamp.valueOf();

  return DBShiftDoc.save();
}

export async function AddSubShiftTime(
  this: ThisType,
  Type: "Add" | "Sub" | "Subtract",
  Duration: number
) {
  Duration = Math.round(Duration);
  const DBShiftDoc = await this.getLatestVersion(false, false);
  if (!DBShiftDoc) {
    throw new AppError({ template: "NoShiftFoundWithId", showable: true });
  }

  if (Type === "Add") {
    DBShiftDoc.durations.on_duty_mod += Duration;
  } else {
    DBShiftDoc.durations.on_duty_mod -= Math.min(Duration, DBShiftDoc.durations.on_duty);
  }

  return DBShiftDoc.save();
}

export async function PreShiftDocDelete(
  this: ThisType,
  next: CallbackWithoutResultAndOptionalError = () => {}
) {
  ActiveShiftsCache.del(this._id);
  const UserProfile = await ProfileModel.findOneAndUpdate(
    { user: this.user, guild: this.guild },
    { user: this.user, guild: this.guild },
    { upsert: true, new: true }
  ).exec();

  if (!UserProfile?.shifts.logs.includes(this._id)) {
    return next();
  }

  UserProfile.shifts.logs = UserProfile.shifts.logs.filter((ShiftID) => ShiftID !== this._id);
  UserProfile.shifts.total_durations.on_duty -= this.durations.on_duty;
  UserProfile.shifts.total_durations.on_break -= this.durations.on_break;

  await UserProfile.save()
    .then(() => next())
    .catch((Err) => next(Err));
}

export async function PreShiftModelDelete(
  this: Query<
    { deleteCount: number; acknowledged: boolean },
    Shifts.ShiftDocument,
    object,
    Shifts.ShiftDocument
  >,
  type: "many" | "one",
  next: CallbackWithoutResultAndOptionalError = () => {}
) {
  const Filter = this.getFilter();

  if (type === "one") {
    const ShiftDoc = await this.model.findOne(Filter).exec();
    if (ShiftDoc) {
      return PreShiftDocDelete.call(ShiftDoc, next);
    }
    return next();
  }

  const Shifts = await this.model.find<Shifts.HydratedShiftDocument>(Filter).exec();
  const MappedDocs = Map.groupBy(Shifts, (Doc) => [Doc.user, Doc.guild]);

  for (const [UserData, ShiftDocs] of MappedDocs.entries()) {
    const ShiftIds = ShiftDocs.map((Doc) => Doc._id);
    const OnDutyTime = ShiftDocs.reduce((Sum, CurrDoc) => Sum + CurrDoc.durations.on_duty, 0);
    const OnBreakTime = ShiftDocs.reduce((Sum, CurrDoc) => Sum + CurrDoc.durations.on_break, 0);

    for (const ShiftId of ShiftIds) {
      ActiveShiftsCache.del(ShiftId);
    }

    await ProfileModel.updateOne(
      {
        user: UserData[0],
        guild: UserData[1],
      },
      {
        $pull: { "shifts.logs": { $in: ShiftIds } },
        $inc: {
          "shifts.total_durations.on_duty": -OnDutyTime,
          "shifts.total_durations.on_break": -OnBreakTime,
        },
      }
    );
  }

  return next();
}

export default {
  end: ShiftEnd,
  breakEnd: ShiftBreakEnd,
  breakStart: ShiftBreakStart,
  incrementEvents: ShiftEventAdd,
  getLatestVersion: GetLatestVersion,
  hasBreakActive: HasBreakActive,
  hasBreaks: HasBreaks,

  setOnDutyTime: SetShiftTime,
  resetOnDutyTime: ResetShiftTime,
  addSubOnDutyTime: AddSubShiftTime,

  async addOnDutyTime(this: ThisType, Duration: number) {
    return AddSubShiftTime.call(this, "Add", Duration);
  },

  async subOnDutyTime(this: ThisType, Duration: number) {
    return AddSubShiftTime.call(this, "Sub", Duration);
  },
} as Omit<Shifts.ShiftDocumentOverrides, "durations">;
