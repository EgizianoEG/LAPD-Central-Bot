const GuildModel = require("../../Models/Guild.js");
const GuildProfile = require("../../Models/GuildProfile.js");
// -------------------------------------------------

/**
 * Checks if a given user is already logged in using the bot.
 * @param {SlashCommandInteraction} CmdInteraction
 * @returns {Promise<Number>} Logged in Roblox user id. This value would be `0` if the user is not already logged in.
 */
async function IsLoggedIn(CmdInteraction) {
  const GuildDoc = await GuildModel.findById(CmdInteraction.guildId).exec();
  const Member = await GuildProfile.findOne({
    user_id: CmdInteraction.user.id,
    guild_id: CmdInteraction.guildId,
  }).exec();

  if (Member) {
    return Member.linked_account.roblox_user_id;
  }

  await GuildProfile.create({
    user_id: CmdInteraction.user.id,
    guild_id: CmdInteraction.guildId,
  }).then((Doc) => {
    GuildDoc?.members.push(Doc._id);
    return GuildDoc?.save();
  });

  return 0;
}

// -------------------------
module.exports = IsLoggedIn;
