// eslint-disable-next-line no-unused-vars
const { Client, Guild } = require("discord.js");
const GuildModel = require("../../Models/Guild");

/**
 * Initialize the database by adding/updating/verifying guild data.
 * @param {Client} Client
 * @param {Guild} CreatedGuild
 */
async function InitializeGuildDatabase(Client, CreatedGuild) {
  const GuildFound = await GuildModel.findOne({ guild_id: CreatedGuild.id });
  if (!GuildFound) {
    GuildModel.create({
      guild_id: CreatedGuild.id,
    });
  }
}

module.exports = InitializeGuildDatabase;
