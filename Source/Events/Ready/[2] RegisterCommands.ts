import { GuildApplicationCommandManager, ApplicationCommandManager, Collection } from "discord.js";
import { Discord } from "@Config/Secrets.js";

import GetDeployedCommands from "@Utilities/Other/GetAppCmds.js";
import CmdsAreIdentical from "@Utilities/Other/CmdsAreIdentical.js";
import GetLocalCommands from "@Utilities/Other/GetLocalCmds.js";
import Chalk from "chalk";
import Util from "node:util";

/**
 * Handles command registration, deployment, and updates
 * @param Client
 */
export default async function RegisterCommands(Client: DiscordClient) {
  try {
    const AppCommands = await GetDeployedCommands(Client);
    const LocalCommands = await GetLocalCommands();

    for (const LocalCommand of LocalCommands) {
      const { name: CmdName } = LocalCommand.data;
      const AppDeployedCmd = AppCommands.cache.find((Cmd) => Cmd.name === CmdName);
      const DeletedCmdLog = Util.format(
        "%s - Registering '%s' command skipped; property 'deleted' is set to true.",
        Chalk.bold.blue("🛈"),
        Chalk.bold(CmdName)
      );

      if (AppDeployedCmd) {
        await HandleExistingCommand(Client, LocalCommand, AppDeployedCmd);
      } else {
        if (!LocalCommand.options?.devOnly && LocalCommand.options?.deleted) {
          console.log(DeletedCmdLog);
          continue;
        }

        const Guild = Client.guilds.cache.get(Discord.TestGuildId);
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
}

// -----------------------------------------------------------------------------
// Helpers:
// --------
/**
 * Handles the existence of a slash command including its updates and deletion
 * @param Client
 * @param LocalCmd
 * @param ExistingCmd
 * @returns
 */
async function HandleExistingCommand(
  Client: DiscordClient,
  LocalCmd: SlashCommandObject,
  ExistingCmd: DiscordJS.ApplicationCommand
) {
  const CmdManager = ExistingCmd.manager;

  if (LocalCmd.options?.deleted) {
    return CmdManager.delete(ExistingCmd.id)
      .then(() => {
        console.log(
          "%s - '%s' command has been deleted%s due its set property 'deleted'",
          Chalk.bold.blue("🛈"),
          Chalk.bold(ExistingCmd.name),
          CmdManager instanceof GuildApplicationCommandManager ? " (guild scope)" : " globally"
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
 * A helper that handles the switching between slash command scopes (from guild scope -> global and vice versa)
 * @param Client
 * @param LocalCmd
 * @param ExistingCmd
 * @returns
 */
async function HandleCommandScopeSwitching(
  Client: DiscordClient,
  LocalCmd: SlashCommandObject,
  ExistingCmd: DiscordJS.ApplicationCommand
) {
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
    .create(LocalCmd.data, SwitchTo === "guild" ? Discord.TestGuildId : undefined)
    .then((Cmd) => {
      Client.commands.set(Cmd.name, LocalCmd);
      console.log(
        "✅ - Successfully switched '%s' slash command to %s scope.",
        Chalk.bold(Cmd.name),
        SwitchTo
      );
    })
    .catch((Err) => {
      throw new Error(
        `Failed to switch '${ExistingCmd.name}' slash command scope; Exiting with error:\n`,
        Err
      );
    });
}
