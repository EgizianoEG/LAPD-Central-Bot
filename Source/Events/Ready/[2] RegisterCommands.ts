import { GuildApplicationCommandManager, ApplicationCommandManager, Collection } from "discord.js";
import { Discord } from "@Config/Secrets.js";

import GetDeployedCommands from "@Utilities/Other/GetAppCmds.js";
import CmdsAreIdentical from "@Utilities/Other/CmdsAreIdentical.js";
import GetLocalCommands from "@Utilities/Other/GetLocalCmds.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import Chalk from "chalk";
import Util from "node:util";

const LogLabel = "Events:Ready:RegisterCommands";
const OneTab = " ".repeat(4);

/**
 * Handles command registration, deployment, and updates
 * @param Client
 */
export default async function RegisterCommands(Client: DiscordClient) {
  AppLogger.debug({
    message: "Started registering and deploying slash commands...",
    label: LogLabel,
  });

  try {
    const AppCommands = await GetDeployedCommands(Client);
    const LocalCommands = await GetLocalCommands();

    for (const LocalCommand of LocalCommands) {
      const { name: CmdName } = LocalCommand.data;
      const AppDeployedCmd = AppCommands.cache.find((Cmd) => Cmd.name === CmdName);
      const DeletedCmdLog = Util.format(
        "Registering '%s' command was skipped; property 'deleted' is set to true.",
        Chalk.bold(CmdName)
      );

      if (AppDeployedCmd) {
        await HandleExistingCommand(Client, LocalCommand, AppDeployedCmd);
      } else {
        if (!LocalCommand.options?.devOnly && LocalCommand.options?.deleted) {
          AppLogger.info(DeletedCmdLog, { label: LogLabel });
          continue;
        }

        const Guild = Client.guilds.cache.get(Discord.TestGuildId);
        const GuildCommands = await Guild?.commands?.fetch();
        const GuildExistingCmd = GuildCommands?.find((Cmd) => Cmd.name === CmdName);

        if (GuildExistingCmd || LocalCommand.options?.devOnly) {
          if (!Guild) {
            AppLogger.info({
              message:
                "Registering '%s' command skipped; could not find the testing guild to register on.",
              splat: [Chalk.bold(CmdName)],
              label: LogLabel,
            });
            continue;
          }

          if (GuildExistingCmd) {
            await HandleExistingCommand(Client, LocalCommand, GuildExistingCmd);
          } else {
            if (LocalCommand.options?.deleted) {
              AppLogger.info(DeletedCmdLog, { label: LogLabel });
              continue;
            }

            await Guild.commands.create(LocalCommand.data).then(() => {
              Client.commands.set(CmdName, LocalCommand);
              AppLogger.info({
                message: "'%s' slash command has been registered on '%s' server.",
                splat: [Chalk.bold(CmdName), Chalk.bold(Guild.name)],
                label: LogLabel,
              });
            });
          }
          continue;
        }

        if (!(AppCommands instanceof Collection)) {
          await AppCommands.create(LocalCommand.data).then(() => {
            Client.commands.set(CmdName, LocalCommand);
            AppLogger.info({
              message: "'%s' slash command has been registered globally.",
              splat: [Chalk.bold(CmdName)],
              label: LogLabel,
            });
          });
        }
      }
    }

    AppLogger.info({
      message: "%o slash command(s) %s been registered locally; %o globally deployed.",
      splat: [
        Client.commands.size,
        Client.commands.size > 1 ? "have" : "has ",
        AppCommands.cache.size,
      ],
      label: LogLabel,
    });
  } catch (Err: any) {
    AppLogger.error({
      message: "An error occurred while executing.",
      label: LogLabel,
      stack: Err.stack,
      details: { ...Err },
    });
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
        AppLogger.info({
          label: LogLabel,
          message: "'%s' slash command has been deleted%s; property 'deleted' is set to true.",
          splat: [
            Chalk.bold(ExistingCmd.name),
            CmdManager instanceof GuildApplicationCommandManager ? " (guild scope)" : " globally",
          ],
        });
      })
      .catch((Err) => {
        throw new Error(
          `Failed to delete '${ExistingCmd.name}' slash command from the application;\n${
            OneTab + Err
          }`
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
      .then((Cmd) => {
        AppLogger.info({
          label: LogLabel,
          splat: [Chalk.bold(Cmd.name)],
          message: "Successfully updated '%s' slash command.",
        });
      })
      .catch((Err) => {
        throw new Error(`Failed to update '${ExistingCmd.name}' slash command;\n${OneTab + Err}`);
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

  await OrgCmdManager.delete(ExistingCmd.id).catch((Err) => {
    throw new Error(
      `Failed to delete '${ExistingCmd.name}' slash command from the API;\n${OneTab + Err}`
    );
  });

  await Client.application.commands
    .create(LocalCmd.data, SwitchTo === "guild" ? Discord.TestGuildId : undefined)
    .then((Cmd) => {
      Client.commands.set(Cmd.name, LocalCmd);
      AppLogger.info({
        label: LogLabel,
        splat: [Chalk.bold(Cmd.name), Chalk.bold(SwitchTo), Chalk.bold(SwitchFrom)],
        message: "Switched '%s' slash command scope to %s rather than %s.",
      });
    })
    .catch((Err) => {
      throw new Error(
        `Failed to switch '${ExistingCmd.name}' slash command scope; Exiting with error:\n${
          OneTab + Err
        }`
      );
    });
}
