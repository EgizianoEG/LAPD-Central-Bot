import { CronJobFileDefReturn } from "@Typings/Global.js";
import { GetDirName } from "@Utilities/Other/Paths.js";

import AppLogger from "@Utilities/Classes/AppLogger.js";
import GetFiles from "@Utilities/Other/GetFilesFrom.js";
import Chalk from "chalk";
import Cron from "node-cron";
import Path from "node:path";
const HandlerLabel = "Handlers:CronJobs";

export default async function CronJobsHandler(Client: DiscordClient) {
  const CronJobPaths = GetFiles(Path.join(GetDirName(import.meta.url), "..", "Jobs"));
  let CronJobsScheduled = 0;

  for (const JobPath of CronJobPaths) {
    const JobData = (await import(JobPath)).default as CronJobFileDefReturn;
    const JobFileName = Path.basename(JobPath);
    if (typeof JobData === "object") {
      if (typeof JobData.cron_func === "function") {
        Cron.schedule(
          JobData.cron_exp,
          function CSFMask(Now) {
            return (JobData.cron_func as NonNullable<CronJobFileDefReturn["cron_func"]>)(
              Now,
              Client
            );
          },
          JobData.cron_opts
        ).start();
        CronJobsScheduled++;
      } else {
        AppLogger.warn({
          label: HandlerLabel,
          splat: [Chalk.bold(JobFileName)],
          message:
            "The cron job object returned from '%s' doesn't include a cron function. Skipping scheduling.",
        });
      }
    } else {
      AppLogger.warn({
        label: HandlerLabel,
        splat: [Chalk.bold(JobFileName)],
        message: "File '%s' does not export a valid cron job object. Skipping scheduling.",
      });
    }
  }

  AppLogger.info({
    label: HandlerLabel,
    splat: [CronJobsScheduled],
    message: "Successfully scheduled %s cron jobs.",
  });
}
