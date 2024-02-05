import { connections as MongooseConnection, STATES as DBStates } from "mongoose";
import GetOSMetrics from "@Utilities/Other/GetOSMetrics.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import Cron from "node-cron";

export default async function MetricsLogger(Client: DiscordClient) {
  // Schedule for logging metrics every 5 seconds.
  AppLogger.info({
    label: "Handlers:MetricsLogger",
    message: "Starting metrics logging cron job; every 5 seconds.",
  });

  Cron.schedule(
    "*/5 * * * * *",
    function LogMetrics() {
      GetOSMetrics(false).then((Metrics) => {
        AppLogger.metrics({
          message: "[Metrics log]",
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
    },
    { timezone: "America/Los_Angeles" }
  ).start();
}
