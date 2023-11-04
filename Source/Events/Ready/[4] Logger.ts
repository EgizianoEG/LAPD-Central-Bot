/* eslint-disable */
import { Discord } from "@Config/Secrets.js";
import { Client } from "discord.js";
import GuildModel from "@Models/Guild.js";
import ShiftModel from "@Models/Shift.js";
import GuildProfile from "@Models/GuildProfile.js";
import GetUserPresence from "@Utilities/Roblox/GetUserPresence.js";
import ShiftActive from "@Utilities/Database/GetShiftActive.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import Chalk from "chalk";
/* eslint-enable */

export default async function DevelopmentLogger(Client: DiscordClient) {
  // -----
  process.on("uncaughtException", (Err) => {
    console.group(Chalk.red("Uncaught Exception:"));
    console.log(Err.stack);
    console.groupEnd();
  });

  setTimeout(() => {
    if (global.gc) {
      global.gc();
    }
    AppLogger.log("debug", "Current memory usage: %o", process.memoryUsage());
  }, 10 * 10_000);
}
