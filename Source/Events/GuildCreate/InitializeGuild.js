const GuildModel = require("../../Models/Guild");

/**
 * Initialize the database by adding/updating/verifying guild data.
 * @param {DiscordClient} _
 * @param {DiscordJS.Guild} CreatedGuild
 */
async function InitializeGuild(_, CreatedGuild) {
  const GuildFound = await GuildModel.exists({ _id: CreatedGuild.id }).exec();
  if (!GuildFound) {
    GuildModel.create({
      _id: CreatedGuild.id,
    });
  }
}

module.exports = InitializeGuild;
