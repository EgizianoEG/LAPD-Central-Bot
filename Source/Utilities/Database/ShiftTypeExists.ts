import GuildModel from "@Models/Guild.js";

export default async function ShiftTypeExists(
  GuildID: string,
  ShiftType: string
): Promise<boolean> {
  if (ShiftType.match(/^Default$/i)) return true;
  return GuildModel.aggregate([
    {
      $match: {
        _id: GuildID,
      },
    },
    {
      $project: {
        exists: {
          $in: [ShiftType, "$settings.shifts.types.name"],
        },
      },
    },
  ]).then((Result) => Result[0]?.exists ?? false);
}
