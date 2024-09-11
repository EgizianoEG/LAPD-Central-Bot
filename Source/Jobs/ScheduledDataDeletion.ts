import { CronJobFileDefReturn } from "@Typings/Global.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import GuildModel from "@Models/Guild.js";

async function CleanupUnavailableGuilds(Now: Date | "init" | "manual") {
  const CurrentDate = Now instanceof Date ? Now : new Date();
  const ScheduledGuildCount = await GuildModel.countDocuments({
    deletion_scheduled_on: { $lte: CurrentDate },
  }).exec();

  if (ScheduledGuildCount === 0) return;
  return GuildModel.deleteMany({
    deletion_scheduled_on: { $lte: CurrentDate },
  })
    .exec()
    .then((DeleteResult) => {
      AppLogger.info({
        splat: [DeleteResult.deletedCount, ScheduledGuildCount],
        label: "Jobs:ScheduledDataDeletion",
        message:
          "%i out of %i guilds was successfully deleted from the database due to their deletion schedule.",
      });
    });
}

export default {
  cron_exp: "*/10 * * * *",
  cron_func: CleanupUnavailableGuilds as any,
  cron_opts: {
    errorHandlingMechanism: "silent/log",
    timezone: "America/Los_Angeles",
  },
} as CronJobFileDefReturn;
