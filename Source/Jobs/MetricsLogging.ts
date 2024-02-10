import { connections as MongooseConnection, STATES as DBStates } from "mongoose";
import { Other as OtherSecrets } from "@Config/Secrets.js";
import { CronJobFileDefReturn } from "@Typings/Global.js";
import GetOSMetrics from "@Utilities/Other/GetOSMetrics.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";

const IsProductionEnv = !!OtherSecrets.Environment?.trim().match(/^Prod(?:uction)?$/i);
if (IsProductionEnv) {
  AppLogger.info({
    label: "Jobs:MetricsLogging",
    message: "Production environment detected. Starting metrics logging cron job; every 5 seconds.",
  });
}

async function MetricsLog(_: any, Client: DiscordClient) {
  GetOSMetrics(false).then((Metrics) => {
    AppLogger.metrics({
      message: "[Metrics Log]",
      metrics: {
        process: Metrics,
        database: {
          status: DBStates[MongooseConnection[0].readyState],
        },
        client: {
          online: Client.isReady(),
          uptime: Client.uptime,
        },
      },
    });
  });
}

export default {
  cron_exp: "*/5 * * * * *",
  cron_opts: { timezone: "America/Los_Angeles" },
  cron_func: IsProductionEnv ? MetricsLog : undefined,
} as CronJobFileDefReturn;
