import { CallbackWithoutResultAndOptionalError, Query } from "mongoose";
import { ActiveShiftsCache } from "@Utilities/Other/Cache.js";
import { ExtraTypings } from "@Typings/Utilities/Database.js";
import ProfileModel from "@Models/GuildProfile.js";
import AppError from "@Utilities/Classes/AppError.js";

const ErrorTitle = "Invalid Action";
type ThisType = ExtraTypings.HydratedShiftDocument;

async function GetUpdatedDocument(Document: ThisType) {
  const Found = await (Document.constructor as any)
    .findOne({ _id: Document._id })
    .catch(() => null);
  return (Found ?? Document) as ThisType;
}

export function IsBreakActive(this: ThisType) {
  return this.events.breaks.some(([, end]) => end === null);
}

export function ShiftEventAdd(this: ThisType, type: "arrests" | "citations") {
  this.events[type]++;
  return this.save();
}

export async function ShiftBreakStart(this: ThisType, timestamp: number = Date.now()) {
  const DBDocument = await GetUpdatedDocument(this);

  if (this.isBreakActive()) {
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
  const DBDocument = await GetUpdatedDocument(this);

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
  const DBDocument = await GetUpdatedDocument(this);

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
  this.durations.on_duty =
    DBDocument.end_timestamp.valueOf() - DBDocument.start_timestamp.valueOf();

  if (DBDocument.events.breaks.length) {
    for (const Break of DBDocument.events.breaks) {
      if (!Break[1]) Break[1] = DBDocument.end_timestamp.valueOf();
      const [StartEpoch, EndEpoch] = Break;
      DBDocument.durations.on_break += EndEpoch - StartEpoch;
    }
    DBDocument.durations.on_duty -= DBDocument.durations.on_break;
    DBDocument.durations.on_duty = Math.max(DBDocument.durations.on_duty, 0);
  }

  return DBDocument.save().then(async (ShiftDoc) => {
    ActiveShiftsCache.del(ShiftDoc._id);
    await ProfileModel.updateOne(
      {
        user_id: ShiftDoc.user,
        guild: ShiftDoc.guild,
      },
      {
        $push: { "shifts.logs": ShiftDoc._id },
        $inc: {
          "shifts.total_durations.on_duty": DBDocument.durations.on_duty,
          "shifts.total_durations.on_break": DBDocument.durations.on_break,
        },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
    return DBDocument;
  });
}

export async function PreShiftDocDelete(
  this: ThisType,
  next: CallbackWithoutResultAndOptionalError = () => {}
) {
  ActiveShiftsCache.del(this._id);
  const UserProfile = await ProfileModel.findOneAndUpdate(
    { user_id: this.user, guild: this.guild },
    { user_id: this.user, guild: this.guild },
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
    ExtraTypings.ShiftDocument,
    object,
    ExtraTypings.ShiftDocument
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

  const Shifts = await this.model.find<ExtraTypings.HydratedShiftDocument>(Filter).exec();
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
        user_id: UserData[0],
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
  isBreakActive: IsBreakActive,
} as Record<
  keyof Omit<ExtraTypings.ShiftDocOverrides, "durations">,
  (this: ThisType, arg0: any) => any
>;
