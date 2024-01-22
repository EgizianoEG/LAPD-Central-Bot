import { CallbackWithoutResultAndOptionalError, Query } from "mongoose";
import { ExtraTypings } from "@Typings/Utilities/Database.js";
import ProfileModel from "@Models/GuildProfile.js";
import AppError from "@Utilities/Classes/AppError.js";
import { ActiveShiftsCache } from "@Utilities/Other/Cache.js";

const ErrorTitle = "Invalid Action";
type ThisType = ExtraTypings.HydratedShiftDocument;

export function IsBreakActive(this: ThisType) {
  return this.events.breaks.some(([, end]) => end === null);
}

export function ShiftEventAdd(this: ThisType, type: "arrests" | "citations") {
  this.events[type]++;
  return this.save();
}

export function ShiftBreakStart(this: ThisType, timestamp: number = Date.now()) {
  if (this.isBreakActive()) {
    return Promise.reject(
      new AppError({
        Title: ErrorTitle,
        Message:
          "There is already an active break. Please end the current break before starting another.",
        Showable: true,
      })
    );
  }

  this.events.breaks.push([timestamp, null]);
  this.updateDurations();
  return this.save();
}

export function ShiftBreakEnd(this: ThisType, timestamp: number = Date.now()) {
  if (this.events.breaks.length) {
    const BreakActive = this.events.breaks.findIndex(([, end]) => end === null);
    if (BreakActive !== -1) {
      this.events.breaks[BreakActive][1] = timestamp;
      this.updateDurations();
      return this.save();
    }
  }

  return Promise.reject(
    new AppError({
      Title: ErrorTitle,
      Message: "There is no active break to end. Make sure to start a break before ending it.",
      Showable: true,
    })
  );
}

export async function ShiftEnd(this: ThisType, timestamp: Date | number = new Date()) {
  if (this.end_timestamp)
    return Promise.reject(
      new AppError({
        Title: ErrorTitle,
        Message:
          "It appears that this shift has already ended. Make sure you start a new shift before you attempt to end it.",
        Showable: true,
      })
    );
  else this.end_timestamp = new Date(timestamp);
  this.durations.on_duty = this.end_timestamp.valueOf() - this.start_timestamp.valueOf();

  if (this.events.breaks.length) {
    for (const Break of this.events.breaks) {
      if (!Break[1]) Break[1] = this.end_timestamp.valueOf();
      const [StartEpoch, EndEpoch] = Break;
      this.durations.on_break += EndEpoch - StartEpoch;
    }
    this.durations.on_duty -= this.durations.on_break;
    this.durations.on_duty = Math.max(this.durations.on_duty, 0);
  }

  return this.save().then(async (ShiftDoc) => {
    ActiveShiftsCache.del(ShiftDoc._id);
    await ProfileModel.updateOne(
      {
        user_id: ShiftDoc.user,
        guild: ShiftDoc.guild,
      },
      {
        $push: { "shifts.logs": ShiftDoc._id },
        $inc: {
          "shifts.total_durations.on_duty": this.durations.on_duty,
          "shifts.total_durations.on_break": this.durations.on_break,
        },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
    return this;
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

export function UpdateShiftDurations(this: ThisType) {
  const CurrTimestamp = this.end_timestamp?.valueOf() ?? Date.now();
  const TotalShiftDuration = CurrTimestamp - this.start_timestamp.valueOf();
  this.durations.on_duty = TotalShiftDuration;
  this.durations.on_break = 0;

  if (this.events.breaks.length) {
    for (const Break of this.events.breaks) {
      const [StartEpoch, EndEpoch] = Break;
      this.durations.on_break += Math.max((EndEpoch || CurrTimestamp) - StartEpoch, 0);
    }
    this.durations.on_duty -= this.durations.on_break;
    this.durations.on_duty = Math.max(this.durations.on_duty, 0);
  }
}

export default {
  end: ShiftEnd,
  breakEnd: ShiftBreakEnd,
  breakStart: ShiftBreakStart,
  incrementEvents: ShiftEventAdd,
  updateDurations: UpdateShiftDurations,
  isBreakActive: IsBreakActive,
} as Record<
  keyof Omit<ExtraTypings.ShiftDocOverrides, "durations">,
  (this: ThisType, arg0: any) => any
>;
