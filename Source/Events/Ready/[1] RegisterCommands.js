/* eslint-disable no-unused-vars */
const {
  GuildApplicationCommandManager,
  ApplicationCommandManager,
  ApplicationCommand,
  Client,
} = require("discord.js");
/* eslint-enable no-unused-vars */
const Chalk = require("chalk");
const GetAppCommands = require("../../Utilities/General/GetAppCmds");
const GetLocalCommands = require("../../Utilities/General/GetLocalCmds");
const CmdsAreIdentical = require("../../Utilities/General/CmdsAreIdentical");
const { format: Format } = require("util");
const {
  Discord: { Test_Guild_ID },
} = require("../../Json/Secrets.json");
// -----------------------------------------------------------------------------

/**
 * Handles command registration, deployment, and updates
 * @param {Client} Client
 */
module.exports = async (Client) => {
  try {
    const LocalCommands = GetLocalCommands();
    const AppCommands = await GetAppCommands(Client);
    const AppCommandsCache = AppCommands.cache;

    for (const LocalCommand of LocalCommands) {
      const { name: CmdName } = LocalCommand.data;
      const APIExistingCmd = AppCommandsCache.find((Cmd) => Cmd.name === CmdName);
      const DeletedCmdLog = Format(
        "%s - Registering '%s' command skipped; property 'deleted' is set to true.",
        Chalk.bold.blue("🛈"),
        Chalk.bold(CmdName)
      );

      if (APIExistingCmd) {
        await HandleExistingCommand(Client, LocalCommand, APIExistingCmd, AppCommands);
      } else {
        if (!LocalCommand.devOnly && LocalCommand.deleted) {
          console.log(DeletedCmdLog);
          continue;
        }

        if (LocalCommand.devOnly) {
          const Guild = Client.guilds.cache.get(Test_Guild_ID);
          const GuildCommands = await Guild.commands.fetch();
          const GuildExistingCmd = GuildCommands.find((Cmd) => Cmd.name === CmdName);

          if (GuildExistingCmd) {
            await HandleExistingCommand(Client, LocalCommand, GuildExistingCmd, Guild.commands);
          } else {
            if (LocalCommand.deleted) {
              console.log(DeletedCmdLog);
              continue;
            }

            await Guild.commands
              .create(LocalCommand.data)
              .then(() => {
                Client.commands.set(CmdName, LocalCommand);
                console.log(
                  "✅ - '%s' command has been registered on '%s' server.",
                  Chalk.bold(CmdName),
                  Chalk.bold(Guild.name)
                );
              })
              .catch((Err) => {
                throw new Error(Err);
              });
          }
          continue;
        }

        await AppCommands.create(LocalCommand.data)
          .then(() => {
            Client.commands.set(CmdName, LocalCommand);
            console.log("✅ - '%s' command has been registered globally.", Chalk.bold(CmdName));
          })
          .catch((Err) => {
            throw new Error(Err);
          });
      }
    }
  } catch (Err) {
    console.log(
      "%s:%s - An error occurred while executing;\n",
      Chalk.yellow("Ready"),
      Chalk.red("RegisterCommands"),
      Err
    );
  }
};

/**
 * Handles the existence of an API application command
 * @param {Client} Client
 * @param {Object} LocalCmd
 * @param {ApplicationCommand} ExistingCmd
 * @param {(GuildApplicationCommandManager|ApplicationCommandManager)} CmdManager
 */
async function HandleExistingCommand(Client, LocalCmd, ExistingCmd, CmdManager) {
  if (LocalCmd.deleted) {
    return CmdManager.delete(ExistingCmd.id)
      .then((Cmd) => {
        console.log(
          "%s - '%s' command has been deleted %sdue its set property 'deleted'",
          Chalk.bold.blue("🛈"),
          Chalk.bold(Cmd.name),
          CmdManager.constructor === ApplicationCommandManager ? "globally " : ""
        );
      })
      .catch((Err) => {
        console.log(
          "%s:%s - Failed to delete '%s' from the API;\n",
          Chalk.yellow("Ready"),
          Chalk.red("RegisterCommands"),
          Chalk.bold(ExistingCmd.name),
          Err
        );
      });
  }

  if (LocalCmd.forceUpdate || !CmdsAreIdentical(ExistingCmd, LocalCmd)) {
    await CmdManager.edit(ExistingCmd.id, LocalCmd.data)
      .then((Cmd) => {
        console.log(
          "%s - '%s' command has been updated.",
          Chalk.bold.blue("🛈"),
          Chalk.bold(Cmd.name)
        );
      })
      .catch((Err) => {
        console.log(
          "%s:%s - Failed to update '%s' on the API;\n",
          Chalk.yellow("Ready"),
          Chalk.red("RegisterCommands"),
          Chalk.bold(ExistingCmd.name),
          Err
        );
      });
  }
  Client.commands.set(LocalCmd.data.name, LocalCmd);
}
