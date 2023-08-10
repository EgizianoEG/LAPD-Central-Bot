// eslint-disable-next-line no-unused-vars
const { ChatInputCommandInteraction } = require("discord.js");
const GuildModel = require("../../Models/Guild.js");

/**
 * Updates the linked Roblox user id and puts the given one instead
 * This function is runs knowing that the user and their guild are recorded in the database already
 * @param {ChatInputCommandInteraction} CmdInteraction Orginal command interaction
 * @param {(String|Number)} RobloxUserId The user Id to record and put into the database
 * @returns {Promise<(false|String)>} Logged in Roblox user id if found or false if not.
 */
async function UpdateLinkedRobloxUser(CmdInteraction, RobloxUserId) {
  const GuildFound = await GuildModel.findOne({ guild_id: CmdInteraction.guildId });
  const MemberIndex = GuildFound.members.findIndex(
    (Member) => Member.user_id === CmdInteraction.member.id
  );

  GuildFound.members[MemberIndex].linked_user = {
    roblox_user_id: Number(RobloxUserId),
  };

  return GuildFound.save();
}

module.exports = UpdateLinkedRobloxUser;
