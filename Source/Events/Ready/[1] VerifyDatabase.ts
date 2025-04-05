import { addDays } from "date-fns";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import GuildModel from "@Models/Guild.js";
const FileLabel = "Events:Ready:VerifyDatabase";
const GuildDataDeletionScheduleDays = 7;

/**
 * Verifies the bot database for any joined guild that is not recorded on it.
 * @param Client - The Discord client instance used to interact with the Discord API.
 */
export default async function VerifyDatabase(Client: DiscordClient): Promise<void> {
  try {
    const Guilds = await Client.guilds.fetch();
    const NewGuilds: (typeof GuildModel.schema.obj)[] = [];
    const GuildsInDB = new Set(
      (await GuildModel.find().select({ _id: 1 }).lean().exec()).map((GuildDoc) => GuildDoc._id)
    );

    for (const JoinedGuild of Guilds.values()) {
      const GuildFound = GuildsInDB.has(JoinedGuild.id);
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
    const ActiveGuildIds = new Set(Guilds.keys());
    const LeftGuilds = GuildsInDB.difference(ActiveGuildIds);
    if (LeftGuilds.size > 0) {
      const UpdateManyResult = await GuildModel.updateMany(
        {
          _id: { $in: Array.from(LeftGuilds) },
          deletion_scheduled_on: null,
        },
        {
          $set: {
            deletion_scheduled_on: addDays(new Date(), GuildDataDeletionScheduleDays),
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
