// Dependencies:
// --------------------------------------------------------------------

import { Routes } from "discord.js";
import { Discord } from "@Config/Secrets.js";

import GetAppCommands from "@Utilities/Other/GetAppCmds.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import Chalk from "chalk";

const Enabled = false;
const AllGuildCommands = false;
const GlobalCommandsToDelete = [""]; // The names of all commands to delete
const LogLabel = "Events:Ready:DeleteCmds";

// --------------------------------------------------------------------
export default async function RemoveCommands(Client: DiscordClient) {
  if (!Enabled) return;
  if (AllGuildCommands) {
    const Guild = Client.guilds.cache.get(Discord.TestGuildId);
    if (!Guild) {
      return AppLogger.warn({
        label: LogLabel,
        message: "Couldn't find the testing guild to remove its commands; deletion terminated.",
      });
    }

    Guild.commands
      .set([])
      .then(() => {
        AppLogger.info({
          label: LogLabel,
          message: `Successfully deleted all ${Chalk.yellow(Guild.name)} server commands.`,
        });
      })
      .catch((Err) => {
        AppLogger.error({
          label: LogLabel,
          stack: Err.stack,
          message: "An error occurred while removing commands;",
        });
      });
    return;
  }

  try {
    const MatchingCommands: DiscordJS.ApplicationCommand[] = [];
    const GlobalCommands = (await GetAppCommands(Client)).cache;

    for (const CommandName of GlobalCommandsToDelete) {
      const Existing = GlobalCommands.find((Command) => Command.name === CommandName);
      if (Existing) {
        MatchingCommands.push(Existing);
      }
    }

    for (const Command of MatchingCommands) {
      Client.rest.delete(Routes.applicationCommand(Client.user.id, Command.id)).then(() => {
        AppLogger.info({
          label: LogLabel,
          message: `Successfully deleted ${Chalk.magenta(Command.name)} application command.`,
        });
      });
    }
  } catch (Err: any) {
    AppLogger.error({
      label: LogLabel,
      stack: Err.stack,
      message: "An error occurred while executing;",
    });
  }
}
