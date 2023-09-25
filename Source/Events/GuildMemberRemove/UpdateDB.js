const ProfileModel = require("../../Models/GuildProfile");

/**
 * Initialize the database by adding/updating/verifying guild data.
 * @param {DiscordClient} _
 * @param {DiscordJS.GuildMember} Member
 */
module.exports = (_, Member) => {
  return ProfileModel.deleteOne({ _id: Member.id, guild: Member.guild.id }).exec();
};
