const GuildModel = require("../../Models/Guild.js");
const GuildProfile = require("../../Models/GuildProfile.js");
// -------------------------------------------------

/**
 * Updates the linked Roblox user id and puts the given one instead
 * This function is runs knowing that the user and their guild are recorded in the database already
 * @param {DiscordJS.ChatInputCommandInteraction} CmdInteraction Orginal command interaction
 * @param {String|Number|Null} [RobloxUserId] The user Id to record and put into the database (`0` by default)
 * @returns A promise resolves to the saved guild document if succeeded
 */
async function UpdateLinkedRobloxUser(CmdInteraction, RobloxUserId = 0) {
  RobloxUserId = Number(RobloxUserId) || 0;
  const GuildDoc = await GuildModel.findById(CmdInteraction.guildId).select("members").exec();
  const Member = await GuildProfile.findOne({
    _id: CmdInteraction.user.id,
    guild: CmdInteraction.guildId,
  }).exec();

  if (Member) {
    Member.linked_account.roblox_user_id = RobloxUserId;
    return Member.save();
  } else {
    return GuildProfile.create({
      _id: CmdInteraction.user.id,
      guild: CmdInteraction.guildId,
      linked_account: {
        roblox_user_id: RobloxUserId,
      },
    }).then((CreatedProfile) => {
      GuildDoc?.members.push(CreatedProfile._id);
      return GuildDoc?.save();
    });
  }
}

// -------------------------------------
module.exports = UpdateLinkedRobloxUser;
