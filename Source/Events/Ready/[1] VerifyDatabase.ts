import { addDays } from "date-fns";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import GuildModel from "@Models/Guild.js";
const FileLabel = "Events:Ready:VerifyDatabase";

/**
 * Verifies the bot database for any joined guild that is not recorded on it.
 * @param Client
 */
export default async function VerifyDatabase(Client: DiscordClient) {
  try {
    const Guilds = await Client.guilds.fetch();
    const GuildsInDB = await GuildModel.find().select({ _id: 1 }).lean().exec();
    const NewGuilds: (typeof GuildModel.schema.obj)[] = [];

    for (const JoinedGuild of Guilds.values()) {
      const GuildFound = GuildsInDB.some((GuildDoc) => GuildDoc._id === JoinedGuild.id);
      if (!GuildFound) {
        NewGuilds.push({ _id: JoinedGuild.id });
      }
    }

    if (NewGuilds.length > 0) {
      await GuildModel.insertMany(NewGuilds);
      AppLogger.debug({
        message: "New guilds were added to the database; added %i records.",
        label: FileLabel,
        splat: [NewGuilds.length],
      });
    }

    // Schedule guild data deletion for guilds that are no longer registered on the application (the application is not in them).
    const LeftGuilds = GuildsInDB.filter((GuildDoc) => !Guilds.has(GuildDoc._id));
    if (LeftGuilds.length > 0) {
      const UpdateManyResult = await GuildModel.updateMany(
        {
          _id: { $in: LeftGuilds.map((GuildDoc) => GuildDoc._id) },
          deletion_scheduled_on: null,
        },
        {
          $set: {
            deletion_scheduled_on: addDays(new Date(), 7),
          },
        }
      ).exec();

      if (UpdateManyResult.modifiedCount > 0) {
        AppLogger.debug({
          message: "Scheduled data deletion for %i guild(s) that the application is no longer in.",
          label: FileLabel,
          splat: [UpdateManyResult.modifiedCount],
        });
      }
    }
  } catch (Err: any) {
    AppLogger.error({
      message: "Failed to verify the database records.",
      label: FileLabel,
      stack: Err.stack,
    });
  }
}
