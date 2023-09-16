/* eslint-disable */
const Chalk = require("chalk");
const GuildProfile = require("../../Models/GuildProfile");
const ShiftModel = require("../../Models/Shift");
const GuildModel = require("../../Models/Guild");
const { Discord } = require("../../Config/Secrets.json");
const { Client } = require("discord.js");
const GetPresence = require("../../Utilities/Roblox/GetPresence");
const ShiftActive = require("../../Utilities/Database/GetShiftActive");
/* eslint-enable */

/**
 * Development logger
 * @param {DiscordClient} Client
 */
module.exports = async (Client) => {
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
};
