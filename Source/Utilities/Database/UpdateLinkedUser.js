const GuildModel = require("../../Models/Guild.js");
// -------------------------------------------------

/**
 * Updates the linked Roblox user id and puts the given one instead
 * This function is runs knowing that the user and their guild are recorded in the database already
 * @param {DiscordJS.ChatInputCommandInteraction} CmdInteraction Orginal command interaction
 * @param {String|Number|Null} [RobloxUserId] The user Id to record and put into the database (`null` by default)
 * @returns {Promise<import("mongoose").Document>} The saved guild document if succeeded saving it
 */
async function UpdateLinkedRobloxUser(CmdInteraction, RobloxUserId = null) {
  RobloxUserId = RobloxUserId ? Number(RobloxUserId) : null;
  const GuildData = await GuildModel.findOne({ id: CmdInteraction.guildId }).exec();
  const MemberIndex = GuildData.members.findIndex(
    (Member) => Member.user_id === CmdInteraction.user.id
  );

  if (MemberIndex === -1) {
    GuildData.members.addToSet({
      user_id: CmdInteraction.user.id,
      linked_user: {
        roblox_user_id: RobloxUserId,
      },
    });
  } else {
    GuildData.members[MemberIndex].linked_user = {
      roblox_user_id: RobloxUserId,
    };
  }

  return GuildData.save();
}

// -------------------------------------
module.exports = UpdateLinkedRobloxUser;
