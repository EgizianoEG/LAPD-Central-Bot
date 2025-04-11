import { GuildArrests } from "@Typings/Utilities/Database.js";
import ArrestModel from "@Models/Arrest.js";

export default async function GetArrestRecord(
  Guild: string,
  BookingNum: number
): Promise<GuildArrests.ArrestRecord | null> {
  return ArrestModel.findOne({
    guild: Guild,
    booking_num: BookingNum,
  })
    .lean()
    .exec();
}
