const GuildModel = require("../../Models/Guild");

/**
 * Initialize the database by adding/updating/verifying guild data.
 * @param {DiscordClient} Client
 * @param {import("discord.js").Guild} CreatedGuild
 */
async function InitializeGuild(Client, CreatedGuild) {
  const GuildFound = await GuildModel.findOne({ id: CreatedGuild.id }).exec();
  if (!GuildFound) {
    GuildModel.create({
      id: CreatedGuild.id,
    });
  }
}

module.exports = InitializeGuild;
