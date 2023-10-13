import GuildModel from "@Models/Guild.js";

/**
 * Checks if a given guild has login restrictions enabled for its users
 * @param GuildId
 * @returns `true` if the guild has login restrictions; `false` if it is not OR the check request didn't succeed.
 */
export default async function IsOptionEnabled(GuildId: string): Promise<boolean> {
  return GuildModel.findById(GuildId)
    .select("settings.require_authorization")
    .then((GuildData) => GuildData?.settings.require_authorization ?? true);
}
