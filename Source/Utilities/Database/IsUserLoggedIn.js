// eslint-disable-next-line no-unused-vars
const { ChatInputCommandInteraction } = require("discord.js");
const GuildModel = require("../../Models/Guild.js");

/**
 * Checks if a given user is already logged in using the bot.
 * @param {ChatInputCommandInteraction} CmdInteraction
 * @returns {Promise<(false|String)>} Logged in Roblox user id if found or false if not.
 */
async function IsLoggedIn(CmdInteraction) {
  const GuildFound = await GuildModel.findOne({ guild_id: CmdInteraction.guildId });
  const MemberFound = GuildFound.members.find(
    (Member) => Member.user_id === CmdInteraction.member.id
  );

  if (MemberFound) {
    return MemberFound.linked_user.roblox_user_id ?? false;
  } else {
    GuildFound.members.addToSet({
      user_id: CmdInteraction.member.id,
    });
    GuildFound.save();
  }
  return false;
}

module.exports = IsLoggedIn;
