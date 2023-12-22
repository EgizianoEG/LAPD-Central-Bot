import GuildModel from "@Models/Guild.js";

/**
 * Title explains.
 * @param GuildId - The ID of the guild to get its settings.
 * @returns
 */
export default async function GetGuildSettings(GuildId: string) {
  return GuildModel.findById(GuildId)
    .select("settings")
    .then((GuildData) => {
      if (!GuildData) return null;
      return GuildData.settings;
    });
}
