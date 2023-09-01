const GuildModel = require("../../Models/Guild");

/**
 * Verify the bot database for any joined guild that is not recorded in it
 * @param {DiscordClient} Client
 */
async function VerifyDatabase(Client) {
  const Guilds = (await Client.guilds.fetch()).values();
  const NewGuilds = [];

  for (const JoinedGuild of Guilds) {
    const GuildFound = await GuildModel.exists({ _id: JoinedGuild.id }).exec();
    if (!GuildFound) {
      NewGuilds.push({ _id: JoinedGuild.id });
    }
  }

  if (NewGuilds.length > 0) {
    GuildModel.insertMany(NewGuilds);
  }
}

module.exports = VerifyDatabase;
