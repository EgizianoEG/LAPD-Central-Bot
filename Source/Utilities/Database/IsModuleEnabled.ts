import GuildModel from "@Models/Guild.js";
import { Guilds } from "@Typings/Utilities/Database.js";

/**
 * Checks if a module is enabled in a guild.
 * @param GuildId - The id of the guild to check the module for.
 * @param ModuleName - The name of the module to check.
 * @returns
 */
export default async function IsModuleEnabled(
  GuildId: string,
  ModuleName: keyof Omit<Guilds.GuildSettings, "require_authorization" | "role_perms">
) {
  return GuildModel.aggregate([
    { $match: { _id: GuildId } },
    {
      $set: {
        is_enabled: `$settings.${ModuleName}.enabled`,
      },
    },
    {
      $project: {
        _id: 0,
        is_enabled: 1,
      },
    },
  ]).then((Result: { is_enabled: boolean }[]) => Result[0].is_enabled);
}
