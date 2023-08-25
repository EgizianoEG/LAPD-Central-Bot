const GuildModel = require("../../Models/Guild.js");
// -------------------------------------------------

/**
 * Checks if a given user is already logged in using the bot.
 * @param {SlashCommandInteraction} CmdInteraction
 * @returns {Promise<Boolean|any>} Logged in Roblox user id if found or false if not.
 */
async function UserHasPermissions(CmdInteraction) {
  const GuildData = await GuildModel.findOne({ id: CmdInteraction.guildId }).exec();
  return GuildData.members.find((Member) => Member.user_id === CmdInteraction.user.id);
}

// -------------------------
module.exports = UserHasPermissions;
