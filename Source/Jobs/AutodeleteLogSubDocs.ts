import { type CronJobFileDefReturn } from "@Typings/Global.js";
import { differenceInMilliseconds } from "date-fns";
import GuildModel from "@Models/Guild.js";

async function AutodeleteGuildLogs() {
  const CurrDate = new Date();
  const GuildDocuments = await GuildModel.find(
    { logs: { $exists: true } },
    { logs: 1, settings: { log_deletion_interval: 1 } }
  ).exec();

  for (const GuildDoc of GuildDocuments) {
    const LogDeletionInterval = GuildDoc.settings.log_deletion_interval;
    const ArrestLogIdsToRemove: string[] = [];
    const CitationLogIdsToRemove: string[] = [];
    if (!LogDeletionInterval) continue;

    for (const ArrestReport of GuildDoc.logs.arrests) {
      if (differenceInMilliseconds(ArrestReport.made_at, CurrDate) >= LogDeletionInterval) {
        ArrestLogIdsToRemove.push(ArrestReport._id);
      }
    }

    for (const CitationLog of GuildDoc.logs.citations) {
      if (differenceInMilliseconds(CitationLog.issued_at, CurrDate) >= LogDeletionInterval) {
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
  cron_exp: "*/10 * * * *",
  cron_opts: { timezone: "America/Los_Angeles", runOnInit: true },
  cron_func: AutodeleteGuildLogs as any,
} as CronJobFileDefReturn;
