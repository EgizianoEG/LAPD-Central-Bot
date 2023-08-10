// eslint-disable-next-line no-unused-vars
const { Client } = require("discord.js");
const GuildModel = require("../../Models/Guild");

/**
 * Verify the bot database for any joined guild that is not recorded in it
 * @param {Client} Client
 */
async function VerifyDatabase(Client) {
  const Guilds = Client.guilds.cache.values();
  for (const JoinedGuild of Guilds) {
    const GuildFound = await GuildModel.findOne({ guild_id: JoinedGuild.id });
    if (!GuildFound) {
      GuildModel.create({
        guild_id: JoinedGuild.id,
      });
    }
  }
}

module.exports = VerifyDatabase;
