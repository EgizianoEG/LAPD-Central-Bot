// eslint-disable-next-line no-unused-vars
const { Client } = require("discord.js");
const GuildModel = require("../../Models/Guild");

/**
 * Verify the bot database for any joined guild that is not recorded in it
 * @param {Client} Client
 */
async function VerifyDatabase(Client) {
  const Guilds = Client.guilds.cache.values();
  const NewGuilds = [];

  for (const JoinedGuild of Guilds) {
    const GuildFound = await GuildModel.findOne({ id: JoinedGuild.id });
    if (!GuildFound) {
      NewGuilds.push({ id: JoinedGuild.id });
    }
  }

  if (NewGuilds.length > 0) {
    GuildModel.insertMany(NewGuilds);
  }
}

module.exports = VerifyDatabase;
