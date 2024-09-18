import { type CronJobFileDefReturn } from "@Typings/Global.js";
import { differenceInMilliseconds } from "date-fns";
import GuildModel from "@Models/Guild.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";

async function AutodeleteGuildLogs(Now: Date | "init" | "manual") {
  const Promises: Promise<any>[] = [];
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
    const IncidentLogIdsToRemove: number[] = [];
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

    for (const IncidentLog of GuildDoc.logs.incidents) {
      if (differenceInMilliseconds(IncidentLog.reported_on, CurrentDate) >= LogDeletionInterval) {
        CitationLogIdsToRemove.push(IncidentLog._id);
      }
    }

    const UpdatePromise = GuildModel.updateOne(
      { _id: GuildDoc._id },
      {
        $pull: {
          "logs.arrests": { _id: { $in: ArrestLogIdsToRemove } },
          "logs.citations": { num: { $in: CitationLogIdsToRemove } },
          "logs.incidents": { _id: { $in: IncidentLogIdsToRemove } },
        },
      }
    )
      .exec()
      .catch((Err) => {
        AppLogger.error({
          label: "Jobs:AutodeleteGuildLogs",
          message: "Failed to update guild logs.",
          guild_id: GuildDoc._id,
          stack: Err.stack,
        });
      });

    Promises.push(UpdatePromise);
  }

  await Promise.allSettled(Promises);
}

export default {
  cron_exp: "*/5 * * * *",
  cron_func: AutodeleteGuildLogs as any,
  cron_opts: {
    timezone: "America/Los_Angeles",
    errorHandlingMechanism: "silent/log",
  },
} as CronJobFileDefReturn;
