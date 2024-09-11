import { type CronJobFileDefReturn } from "@Typings/Global.js";
import { differenceInMilliseconds } from "date-fns";
import GuildModel from "@Models/Guild.js";

async function AutodeleteGuildLogs(Now: Date | "init" | "manual") {
  const CurrentDate = Now instanceof Date ? Now : new Date();
  const GuildDocuments = await GuildModel.find(
    {
      logs: { $exists: true },
      deletion_scheduled_on: { $eq: null },
      "settings.duty_activities.log_deletion_interval": { $gt: 0 },
    },
    { logs: 1, "settings.duty_activities.log_deletion_interval": 1 }
  )
    .lean()
    .exec();

  for (const GuildDoc of GuildDocuments) {
    const LogDeletionInterval = GuildDoc.settings.duty_activities.log_deletion_interval;
    const ArrestLogIdsToRemove: number[] = [];
    const CitationLogIdsToRemove: number[] = [];
    if (!LogDeletionInterval) continue;

    for (const ArrestReport of GuildDoc.logs.arrests) {
      if (differenceInMilliseconds(ArrestReport.made_on, CurrentDate) >= LogDeletionInterval) {
        ArrestLogIdsToRemove.push(ArrestReport._id);
      }
    }

    for (const CitationLog of GuildDoc.logs.citations) {
      if (differenceInMilliseconds(CitationLog.issued_on, CurrentDate) >= LogDeletionInterval) {
        CitationLogIdsToRemove.push(CitationLog.num);
      }
    }

    GuildModel.updateOne(
      { _id: GuildDoc._id },
      {
        $pull: {
          "logs.arrests": { _id: { $in: ArrestLogIdsToRemove } },
          "logs.citations": { num: { $in: CitationLogIdsToRemove } },
        },
      }
    );
  }
}

export default {
  cron_exp: "*/5 * * * *",
  cron_func: AutodeleteGuildLogs as any,
  cron_opts: {
    timezone: "America/Los_Angeles",
    errorHandlingMechanism: "silent/log",
  },
} as CronJobFileDefReturn;
