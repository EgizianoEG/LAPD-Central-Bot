/* eslint-disable */
import Chalk from "chalk";
import GuildProfile from "@Models/GuildProfile.js";
import ShiftModel from "@Models/Shift.js";
import GuildModel from "@Models/Guild.js";
import { Discord } from "@Config/Secrets.js";
import { Client } from "discord.js";
import GetPresence from "@Utilities/Roblox/GetPresence.js";
import ShiftActive from "@Utilities/Database/GetShiftActive.js";
/* eslint-enable */

/**
 * Development logger
 * @param Client
 */
export default async function DevelopmentLogger(Client: DiscordClient) {
  // -----
  process.on("uncaughtException", (Err) => {
    console.group(Chalk.red("Uncaught Exception:"));
    console.log(Err.message);
    console.log(Err.stack);
    console.groupEnd();
  });

  setTimeout(() => {
    if (global.gc) {
      global.gc();
    }
    console.log(Chalk.blue("Debug:"), "Current memory usage:", process.memoryUsage());
  }, 10 * 10_000);
}
