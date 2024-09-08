import { CallbackWithoutResultAndOptionalError, Model, Query } from "mongoose";
import { randomInt as RandomInteger } from "node:crypto";
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

export async function StartNewShift(
  this: Model<Shifts.ShiftDocument, unknown, Shifts.ShiftDocumentOverrides>,
  opts: Omit<
    Required<Pick<Shifts.ShiftDocument, "user" | "guild">> & Partial<Shifts.ShiftDocument>,
    "end_timestamp"
  >
) {
  const StartTimestamp = opts.start_timestamp || new Date();
  const ShiftUniqueId =
    opts._id || `${StartTimestamp.getTime()}${RandomInteger(10, 99)}`.slice(0, 15);

  const ActiveShift = await this.findOneAndUpdate(
    { user: opts.user, guild: opts.guild, end_timestamp: null },
    {
      $setOnInsert: {
        _id: ShiftUniqueId,
        user: opts.user,
        guild: opts.guild,
        type: opts.type || "Default",
        start_timestamp: StartTimestamp,
        end_timestamp: null,
      },
    },
    { upsert: true, new: true }
  ).exec();

  if (ActiveShift._id !== ShiftUniqueId && ActiveShift.end_timestamp === null) {
    throw new AppError({
      template: "ShiftAlreadyActive",
      template_args: [ActiveShift.type],
      showable: true,
      code: 2,
    });
  }

  return ActiveShift;
}

export async function ShiftBreakStart(this: ThisType, timestamp: number = Date.now()) {
  const UpdateDocument = await this.$model()
    .findOneAndUpdate(
      {
        _id: this._id,
        end_timestamp: null,
        $expr: {
          $or: [
            // Case 1: No breaks at all
            {
              // eslint-disable-next-line sonarjs/no-duplicate-string
              $eq: [{ $size: "$events.breaks" }, 0],
            },

            // Case 2: Last break in the array has an end timestamp of null (active break)
            {
              $and: [
                {
                  $gt: [{ $size: "$events.breaks" }, 0],
                },
                {
                  $ne: [
                    {
                      $arrayElemAt: [
                        {
                          $arrayElemAt: ["$events.breaks", -1],
                        },
                        1,
                      ],
                    },
                    null,
                  ],
                },
              ],
            },
          ],
        },
      },
      {
        $push: { "events.breaks": [timestamp, null] },
      },
      { new: true }
    )
    .exec();

  if (!UpdateDocument) {
    return Promise.reject(
      new AppError({
        title: ErrorTitle,
        message: "An active break already exists or the shift is no longer active.",
        showable: true,
      })
    );
  }

  return UpdateDocument as ThisType;
}

export async function ShiftBreakEnd(this: ThisType, timestamp: number = Date.now()) {
  const UpdatedDocument = await this.$model()
    .findOneAndUpdate(
      {
        _id: this._id,
        end_timestamp: null,
        $expr: {
          $eq: [
            {
              $arrayElemAt: [
                {
                  $arrayElemAt: ["$events.breaks", -1],
                }, // Get the last element of the breaks array
                1, // Access the second element of the last sub-array
              ],
            },
            null, // Check if it's null (active break)
          ],
        },
      },
      {
        $set: { "events.breaks.$[elem].1": timestamp },
      },
      {
        arrayFilters: [{ "elem.1": null }], // Update the first active break found
        new: true,
      }
    )
    .exec();

  if (!UpdatedDocument) {
    return Promise.reject(
      new AppError({
        title: ErrorTitle,
        message:
          "There is currently no active break to end. Please start a break before attempting to end it.",
        showable: true,
      })
    );
  }

  return UpdatedDocument as ThisType;
}

export async function ShiftEnd(this: ThisType, timestamp: Date | number = new Date()) {
  const EndTimestamp = new Date(timestamp);
  const UpdatedDocument = await this.$model()
    .findOneAndUpdate(
      {
        _id: this._id,
        end_timestamp: null,
      },
      { $set: { end_timestamp: EndTimestamp } },
      { new: true }
    )
    .exec();

  if (!UpdatedDocument) {
    return Promise.reject(
      new AppError({
        title: ErrorTitle,
        message:
          "This shift may have already ended, or it might have been recently voided or deleted.",
        showable: true,
      })
    );
  }

  return UpdatedDocument as ThisType;
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
