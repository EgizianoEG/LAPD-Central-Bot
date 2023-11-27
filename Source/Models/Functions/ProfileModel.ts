import ShiftModel from "@Models/Shift.js";
import GuildProfile from "@Models/GuildProfile.js";
import {
  CallbackWithoutResultAndOptionalError,
  HydratedDocumentFromSchema,
  Document,
  Query,
} from "mongoose";

type ProfileDoc = HydratedDocumentFromSchema<typeof GuildProfile.schema>;
export function ProfilePostFind(
  Data: ProfileDoc | ProfileDoc[],
  next: CallbackWithoutResultAndOptionalError = () => {}
) {
  if (Data) {
    if (Array.isArray(Data)) {
      Data.forEach((Chunk) => {
        UpdateAvgShiftPeriods(Chunk);
      });
    } else {
      UpdateAvgShiftPeriods(Data);
    }
  }
  return next();
}

export function UpdateAvgShiftPeriods(Data: ProfileDoc) {
  const ShiftCount: number = Data.shifts.logs.length;

  if (ShiftCount === 0) {
    Data.shifts.average_periods.on_duty = 0;
    Data.shifts.average_periods.on_break = 0;
  } else {
    Data.shifts.average_periods.on_duty =
      Math.round(Data.shifts.total_durations.on_duty / ShiftCount) || 0;
    Data.shifts.average_periods.on_break =
      Math.round(Data.shifts.total_durations.on_break / ShiftCount) || 0;
  }
}

export async function PreDelete(this: any, next = () => {}) {
  if (Array.isArray(this)) {
    this.forEach((thisN) => {
      PreDelete.call(thisN);
    });
    return next();
  }

  if (this instanceof Document) {
    await ShiftModel.deleteMany({
      user: this._id,
      guild: (this as any).guild,
    });
  } else if (this instanceof Query) {
    const { _id, guild } = this.getQuery();
    if (_id && guild) {
      await ShiftModel.deleteMany({
        user: _id,
        guild,
      });
    } else {
      const ProfileDoc = await this.model.findOne(this.getQuery()).exec();
      if (ProfileDoc) {
        await ShiftModel.deleteMany({
          user: ProfileDoc._id,
          guild: ProfileDoc.guild,
        });
      }
    }
  }

  return next();
}
