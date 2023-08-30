// Dependencies:
// -------------

const Chalk = require("chalk");
const GetAppCommands = require("../../Utilities/Other/GetAppCmds");
const GetLocalCommands = require("../../Utilities/Other/GetLocalCmds");

const CmdsAreIdentical = require("../../Utilities/Other/CmdsAreIdentical");
const { ApplicationCommandManager } = require("discord.js");
const { format: Format } = require("util");
const {
  Discord: { Test_Guild_ID },
} = require("../../Config/Secrets.json");

// -----------------------------------------------------------------------------

/**
 * Handles command registration, deployment, and updates
 * @param {DiscordClient} Client
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
        if (!LocalCommand.options?.devOnly && LocalCommand.options?.deleted) {
          console.log(DeletedCmdLog);
          continue;
        }

        if (LocalCommand.options?.devOnly) {
          const Guild = Client.guilds.cache.get(Test_Guild_ID);
          const GuildCommands = await Guild?.commands?.fetch();
          const GuildExistingCmd = GuildCommands?.find((Cmd) => Cmd.name === CmdName);

          if (!Guild) {
            console.log(
              "%s - Registering '%s' command skipped; could not find the testing guild to register on.",
              Chalk.bold.blue("🛈"),
              Chalk.bold(CmdName)
            );
            continue;
          }

          if (GuildExistingCmd) {
            await HandleExistingCommand(Client, LocalCommand, GuildExistingCmd, Guild.commands);
          } else {
            if (LocalCommand.options.deleted) {
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
 * @param {DiscordClient} Client
 * @param {SlashCommandObject} LocalCmd
 * @param {DiscordJS.ApplicationCommand} ExistingCmd
 * @param {DiscordJS.GuildApplicationCommandManager | DiscordJS.ApplicationCommandManager} CmdManager
 */
async function HandleExistingCommand(Client, LocalCmd, ExistingCmd, CmdManager) {
  if (LocalCmd.options?.deleted) {
    return CmdManager.delete(ExistingCmd.id)
      .then(() => {
        console.log(
          "%s - '%s' command has been deleted %sdue its set property 'deleted'",
          Chalk.bold.blue("🛈"),
          Chalk.bold(ExistingCmd.name),
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

  if (LocalCmd.options?.forceUpdate || !CmdsAreIdentical(ExistingCmd, LocalCmd)) {
    await CmdManager.edit(ExistingCmd.id, LocalCmd.data)
      .then((Cmd) => {
        console.log(
          "%s - '%s' command has been updated.",
          Chalk.bold.blue("🛈"),
          Chalk.bold(ExistingCmd.name)
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
