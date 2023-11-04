import AppLogger from "@Utilities/Classes/AppLogger.js";
import GuildModel from "@Models/Guild.js";

/**
 * Verifies the bot database for any joined guild that is not recorded in it
 * @param Client
 */
export default async function VerifyDatabase(Client: DiscordClient) {
  const Guilds = (await Client.guilds.fetch()).values();
  const GuildsInDB = await GuildModel.find().select({ _id: 1 }).exec();
  const NewGuilds: (typeof GuildModel.schema.obj)[] = [];

  for (const JoinedGuild of Guilds) {
    const GuildFound = GuildsInDB.some((GuildDoc) => GuildDoc.id === JoinedGuild.id);
    if (!GuildFound) {
      NewGuilds.push({ _id: JoinedGuild.id });
    }
  }

  if (NewGuilds.length > 0) {
    await GuildModel.insertMany(NewGuilds);
    AppLogger.info({
      message: "New guilds were added to the database. Guilds:\n%o",
      label: "Ready:VerifyDatabase",
      splat: [NewGuilds],
    });
  }
}
