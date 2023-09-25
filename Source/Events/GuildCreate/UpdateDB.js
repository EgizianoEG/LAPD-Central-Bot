const GuildModel = require("../../Models/Guild");

/**
 * Updates the database by adding/updating/verifying guild data.
 * @param {DiscordClient} _
 * @param {DiscordJS.Guild} CreatedGuild
 */
module.exports = async function UpdateDatabase(_, CreatedGuild) {
  const GuildExists = await GuildModel.exists({ _id: CreatedGuild.id }).exec();
  if (!GuildExists) {
    GuildModel.create({
      _id: CreatedGuild.id,
    });
  }
};
