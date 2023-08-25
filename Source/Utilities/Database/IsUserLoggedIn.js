const GuildModel = require("../../Models/Guild.js");
// -------------------------------------------------

/**
 * Checks if a given user is already logged in using the bot.
 * @param {import("discord.js").ChatInputCommandInteraction} CmdInteraction
 * @returns {Promise<false|number>} Logged in Roblox user id if found or `false` if not.
 */
async function IsLoggedIn(CmdInteraction) {
  const GuildData = await GuildModel.findOne({ id: CmdInteraction.guildId }).exec();
  const MemberFound = GuildData.members.find((Member) => Member.user_id === CmdInteraction.user.id);

  if (MemberFound) {
    return MemberFound.linked_user.roblox_user_id ?? false;
  } else {
    GuildData.members.addToSet({
      user_id: CmdInteraction.user.id,
    });
    GuildData.save();
  }
  return false;
}

// -------------------------
module.exports = IsLoggedIn;
