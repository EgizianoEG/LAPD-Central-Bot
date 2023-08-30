// Dependencies:
// --------------------------------------------------------------------

const { Routes } = require("discord.js");
const {
  Discord: { Test_Guild_ID, Client_ID },
} = require("../../Config/Secrets.json");
const GetAppCommands = require("../../Utilities/Other/GetAppCmds");
const Chalk = require("chalk");

const Enabled = false;
const AllGuildCommands = false;
const GlobalCommandsToDelete = [""]; // The names of all commands to delete

// --------------------------------------------------------------------

/**
 * Removes specified commands from the application
 * @param {DiscordClient} Client
 */
module.exports = async function RemoveCommands(Client) {
  if (!Enabled) return;
  if (AllGuildCommands) {
    const Guild = Client.guilds.cache.get(Test_Guild_ID);
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
        console.log(`❎ - DeleteComds - An error occurred while removing commands; ${Err.message}`);
      });
    return;
  }

  try {
    const MatchingCommands = [];
    const GlobalCommands = (await GetAppCommands(Client)).cache;

    for (const CommandName of GlobalCommandsToDelete) {
      const Existing = GlobalCommands.find((Command) => Command.name === CommandName);
      if (Existing) {
        MatchingCommands.push(Existing);
      }
    }

    for (const Command of MatchingCommands) {
      Client.rest
        .delete(Routes.applicationCommand(Client_ID, Command.id))
        .then(() =>
          console.log(
            `✅ - Successfully deleted ${Chalk.magenta(Command.name)} application command.`
          )
        );
    }
  } catch (Err) {
    console.log("DeleteCmds - An error occurred while executing; Erro:", Err);
  }
};
