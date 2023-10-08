import GuildModel from "@Models/Guild.js";

/**
 * Returns all created shift types for a given guild id
 */
export default async function GetShiftTypes(
  GuildId: string
): Promise<Utilities.Database.GuildShiftType[]> {
  return GuildModel.findById(GuildId)
    .select("settings.shifts.types")
    .then((GuildData) => {
      return GuildData?.settings.shifts.types.toObject() ?? [];
    });
}
