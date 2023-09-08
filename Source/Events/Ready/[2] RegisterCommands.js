// Dependencies:
// -------------

const Chalk = require("chalk");
const GetAppCommands = require("../../Utilities/Other/GetAppCmds");
const GetLocalCommands = require("../../Utilities/Other/GetLocalCmds");

const CmdsAreIdentical = require("../../Utilities/Other/CmdsAreIdentical");
const { format: Format } = require("util");
const { Discord } = require("../../Config/Secrets.json");

const {
  GuildApplicationCommandManager,
  ApplicationCommandManager,
  Collection,
} = require("discord.js");

// -----------------------------------------------------------------------------

/**
 * Handles command registration, deployment, and updates
 * @param {DiscordClient} Client
 */
module.exports = async (Client) => {
  try {
    const AppCommands = await GetAppCommands(Client);
    const LocalCommands = GetLocalCommands();
    const AppCommandsCache = AppCommands.cache;

    for (const LocalCommand of LocalCommands) {
      const { name: CmdName } = LocalCommand.data;
      const GlobalExistingCmd = AppCommandsCache.find((Cmd) => Cmd.name === CmdName);
      const DeletedCmdLog = Format(
        "%s - Registering '%s' command skipped; property 'deleted' is set to true.",
        Chalk.bold.blue("🛈"),
        Chalk.bold(CmdName)
      );

      if (GlobalExistingCmd) {
        await HandleExistingCommand(Client, LocalCommand, GlobalExistingCmd);
      } else {
        if (!LocalCommand.options?.devOnly && LocalCommand.options?.deleted) {
          console.log(DeletedCmdLog);
          continue;
        }

        const Guild = Client.guilds.cache.get(Discord.Test_Guild_ID);
        const GuildCommands = await Guild?.commands?.fetch();
        const GuildExistingCmd = GuildCommands?.find((Cmd) => Cmd.name === CmdName);

        if (GuildExistingCmd || LocalCommand.options?.devOnly) {
          if (!Guild) {
            console.log(
              "%s - Registering '%s' command skipped; could not find the testing guild to register on.",
              Chalk.bold.blue("🛈"),
              Chalk.bold(CmdName)
            );
            continue;
          }

          if (GuildExistingCmd) {
            await HandleExistingCommand(Client, LocalCommand, GuildExistingCmd);
          } else {
            if (LocalCommand.options?.deleted) {
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

        if (!(AppCommands instanceof Collection)) {
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
 */
async function HandleExistingCommand(Client, LocalCmd, ExistingCmd) {
  const CmdManager = ExistingCmd.manager;

  if (LocalCmd.options?.deleted) {
    return CmdManager.delete(ExistingCmd.id)
      .then(() => {
        console.log(
          "%s - '%s' command has been deleted %sdue its set property 'deleted'",
          Chalk.bold.blue("🛈"),
          Chalk.bold(ExistingCmd.name),
          CmdManager instanceof GuildApplicationCommandManager ? "(guild scope) " : "globally "
        );
      })
      .catch((Err) => {
        throw new Error(
          `Failed to delete '${ExistingCmd.name}' slash command from the API; ${Err}`
        );
      });
  }

  if (
    (CmdManager.constructor === GuildApplicationCommandManager && !LocalCmd.options?.devOnly) ||
    (CmdManager.constructor === ApplicationCommandManager && LocalCmd.options?.devOnly)
  ) {
    return HandleCommandScopeSwitching(Client, LocalCmd, ExistingCmd);
  }

  if (LocalCmd.options?.forceUpdate || !CmdsAreIdentical(ExistingCmd, LocalCmd)) {
    await CmdManager.edit(ExistingCmd.id, LocalCmd.data)
      .then(() => {
        console.log(
          "%s - '%s' command has been updated.",
          Chalk.bold.blue("🛈"),
          Chalk.bold(ExistingCmd.name)
        );
      })
      .catch((Err) => {
        throw new Error(`Failed to update '${ExistingCmd.name}' slash command; ${Err}`);
      });
  }
  Client.commands.set(LocalCmd.data.name, LocalCmd);
}

/**
 *
 * @param {DiscordClient} Client
 * @param {SlashCommandObject} LocalCmd
 * @param {DiscordJS.ApplicationCommand} ExistingCmd
 */
async function HandleCommandScopeSwitching(Client, LocalCmd, ExistingCmd) {
  const OrgCmdManager = ExistingCmd.manager;
  const SwitchFrom = ExistingCmd.guildId ? "guild" : "global";
  const SwitchTo = ExistingCmd.guildId ? "global" : "guild";

  if (
    (SwitchTo === "global" && OrgCmdManager.constructor === ApplicationCommandManager) ||
    (SwitchTo === "guild" && OrgCmdManager.constructor === GuildApplicationCommandManager)
  ) {
    return;
  }

  console.log(
    "%s - Switching the '%s' slash command scope to %s rather than %s..",
    Chalk.bold.blue("🛈"),
    Chalk.bold(ExistingCmd.name),
    SwitchTo,
    SwitchFrom
  );

  await OrgCmdManager.delete(ExistingCmd.id).catch((Err) => {
    throw new Error(`Failed to delete '${ExistingCmd.name}' slash command from the API;\n${Err}`);
  });

  await Client.application.commands
    .create(LocalCmd.data, SwitchTo === "guild" ? Discord.Test_Guild_ID : undefined)
    .then((Cmd) => {
      Client.commands.set(Cmd.name, LocalCmd);
      console.log(
        "✅ - Successfully switched '%s' slash command to %s scope.",
        Chalk.bold(Cmd.name),
        SwitchTo
      );
    })
    .catch((Err) => {
      throw new Error(Err);
    });
}
