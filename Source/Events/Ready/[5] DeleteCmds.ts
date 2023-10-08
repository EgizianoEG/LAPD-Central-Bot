// Dependencies:
// --------------------------------------------------------------------

import { Routes } from "discord.js";
import { Discord } from "@Config/Secrets.js";

import GetAppCommands from "@Utilities/Other/GetAppCmds.js";
import Chalk from "chalk";

const Enabled = false;
const AllGuildCommands = false;
const GlobalCommandsToDelete = [""]; // The names of all commands to delete

// --------------------------------------------------------------------

/**
 * Removes specified commands from the application
 * @param Client
 */
export default async function RemoveCommands(Client: DiscordClient) {
  if (!Enabled) return;
  if (AllGuildCommands) {
    const Guild = Client.guilds.cache.get(Discord.Test_Guild_ID);
    if (!Guild) {
      return console.log(
        Chalk.yellow("Couldn't find the testing guild to remove commands; returned.")
      );
    }

    Guild.commands
      .set([])
      .then(() => {
        console.log(`✅ - Successfully deleted all ${Chalk.yellow(Guild.name)} server commands.`);
      })
      .catch((Err) => {
        console.log(`❎ - DeleteCmds - An error occurred while removing commands; ${Err.message}`);
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
      Client.rest
        .delete(Routes.applicationCommand(Discord.Client_ID, Command.id))
        .then(() =>
          console.log(
            `✅ - Successfully deleted ${Chalk.magenta(Command.name)} application command.`
          )
        );
    }
  } catch (Err) {
    console.log("DeleteCmds - An error occurred while executing; Details:\n", Err);
  }
}
