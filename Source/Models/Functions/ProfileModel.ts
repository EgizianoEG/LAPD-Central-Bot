import { CallbackWithoutResultAndOptionalError, HydratedDocument, Document, Query } from "mongoose";
import { GuildProfiles } from "@Typings/Utilities/Database.js";
import ShiftModel from "@Models/Shift.js";

type ProfileDoc = HydratedDocument<GuildProfiles.ProfileDocument, GuildProfiles.ProfileOverrides>;

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
  if (!Data.shifts) return;
  const ShiftCount = Data.shifts.logs.length;

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
      user: (this as any).user_id,
      guild: (this as any).guild,
    });
  } else if (this instanceof Query) {
    const { user_id, guild } = this.getQuery();
    if (user_id && guild) {
      await ShiftModel.deleteMany({
        user: user_id,
        guild,
      });
    } else {
      const ProfileDoc = await this.model.findOne(this.getQuery()).exec();
      if (ProfileDoc) {
        await ShiftModel.deleteMany({
          user: ProfileDoc.user_id,
          guild: ProfileDoc.guild,
        });
      }
    }
  }

  return next();
}
