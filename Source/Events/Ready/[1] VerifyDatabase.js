const GuildModel = require("../../Models/Guild");
// ----------------------------------------------------------------

/**
 * Verify the bot database for any joined guild that is not recorded in it
 * @param {DiscordClient} Client
 */
async function VerifyDatabase(Client) {
  const Guilds = (await Client.guilds.fetch()).values();
  const GuildsInDB = await GuildModel.find().select({ _id: 1 }).exec();
  const NewGuilds = [];

  for (const JoinedGuild of Guilds) {
    const GuildFound = GuildsInDB.some((GuildDoc) => GuildDoc.id === JoinedGuild.id);
    if (!GuildFound) {
      NewGuilds.push({ _id: JoinedGuild.id });
    }
  }

  if (NewGuilds.length > 0) {
    GuildModel.insertMany(NewGuilds);
  }
}

// ----------------------------------------------------------------
module.exports = VerifyDatabase;
