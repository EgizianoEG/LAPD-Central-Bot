import GuildModel from "@Models/Guild.js";

/**
 * Retrieves the settings for a specific guild from the database.
 * @param {string} GuildId - The unique identifier of the guild to fetch settings for.
 * @param {boolean} [Lean=true] - Determines whether the query result should be a plain JavaScript object
 *                                (lean mode) or a full Mongoose document. Defaults to `true`.
 * @returns A promise that resolves to the guild's settings if found, or `null` if the guild does not exist.
 */
export default async function GetGuildSettings(GuildId: string, Lean: boolean = true) {
  return GuildModel.findById(GuildId)
    .select("settings")
    .lean(Lean)
    .then((GuildData) => {
      if (!GuildData) return null;
      return GuildData.settings;
    });
}
