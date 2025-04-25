import { Discord } from "@Config/Secrets.js";
import {
  GuildApplicationCommandManager,
  ApplicationCommandManager,
  ContextMenuCommandBuilder,
  SlashCommandBuilder,
  Collection,
} from "discord.js";

import GetDeployedCommands from "@Utilities/Other/GetAppCmds.js";
import CmdsAreIdentical from "@Utilities/Other/CmdsAreIdentical.js";
import GetLocalCommands from "@Utilities/Other/GetLocalCmds.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import Chalk from "chalk";

type LocalCmds = Awaited<ReturnType<typeof GetLocalCommands>>;
const LogLabel = "Events:Ready:RegisterCommands";
const OneTab = " ".repeat(4);

/**
 * Handles command registration, deployment, and updates.
 * @param Client - The Discord.js client instance used to interact with the Discord API.
 * @returns A promise that resolves when all commands are registered and deployed successfully.
 */
export default async function RegisterCommands(Client: DiscordClient): Promise<void> {
  AppLogger.debug({
    message: "Started registering and deploying slash commands...",
    label: LogLabel,
  });

  try {
    const TestingGuild = Client.guilds.cache.get(Discord.TestGuildId);
    const [AppCommands, LocalCommands, TestingGuildCommands] = await Promise.all([
      GetDeployedCommands(Client),
      GetLocalCommands(),
      TestingGuild ? await TestingGuild.commands.fetch() : null,
    ]);

    const AppCommandsMap = new Map(AppCommands.cache.map((Cmd) => [Cmd.name, Cmd]));
    const GuildCommandsMap = TestingGuildCommands
      ? new Map(TestingGuildCommands.map((Cmd) => [Cmd.name, Cmd]))
      : new Map<string, DiscordJS.ApplicationCommand>();

    const { GlobalCommands, GuildOnlyCommands, DeletedCommands, CommandsToUpdate } =
      await CategorizeCommands(
        Client,
        LocalCommands,
        AppCommandsMap,
        GuildCommandsMap,
        TestingGuild
      );

    const CommandProcessingPromises: Promise<any>[] = [];
    CommandProcessingPromises.push(ProcessCommandsToUpdate(Client, CommandsToUpdate));
    CommandProcessingPromises.push(
      ProcessDeletedCommands(DeletedCommands, AppCommandsMap, GuildCommandsMap)
    );

    await Promise.all(CommandProcessingPromises);
    if (TestingGuild && GuildOnlyCommands.length > 0) {
      await RegisterGuildCommands(Client, TestingGuild, GuildOnlyCommands);
    }

    if (GlobalCommands.length > 0 && AppCommands && !(AppCommands instanceof Collection)) {
      await RegisterGlobalCommands(Client, AppCommands, GlobalCommands);
    }

    const GlobalRegCmds = Client.application.commands.cache.size;
    const PluralAppCmds = [GlobalRegCmds > 1 ? "s" : "", GlobalRegCmds > 1 ? "have" : "has"];
    const GuildRegCmds = TestingGuild?.commands.cache.size ?? 0;

    AppLogger.info({
      message: "%o application command%s %s been registered; %o globally deployed.",
      splat: [GlobalRegCmds + GuildRegCmds, PluralAppCmds[0], PluralAppCmds[1], GlobalRegCmds],
      label: LogLabel,
    });
  } catch (Err: unknown) {
    AppLogger.error({
      message: "An error occurred while registering commands.",
      label: LogLabel,
      stack: (Err as Error).stack,
      details: { ...(Err as Error) },
    });
  }
}

/**
 * Categorizes local command definitions against currently deployed application and guild commands,
 * determining which commands should be registered globally, registered only in a testing guild,
 * deleted, or updated.
 *
 * @param Client - The Discord client instance.
 * @param LocalCommands - An array of local command definitions to be processed.
 * @param AppCommandsMap - A map of globally deployed application commands, keyed by command name.
 * @param GuildCommandsMap - A map of guild-specific deployed commands, keyed by command name.
 * @param TestingGuild - The testing guild where development-only commands may be registered.
 * @returns An object containing arrays of commands to be registered globally, registered in the guild, deleted, and updated.
 */
async function CategorizeCommands(
  Client: DiscordClient,
  LocalCommands: LocalCmds,
  AppCommandsMap: Map<string, DiscordJS.ApplicationCommand>,
  GuildCommandsMap: Map<string, DiscordJS.ApplicationCommand>,
  TestingGuild: DiscordJS.Guild | undefined
) {
  const GlobalCommands: typeof LocalCommands = [];
  const GuildOnlyCommands: typeof LocalCommands = [];
  const DeletedCommands: typeof LocalCommands = [];
  const CommandsToUpdate: [DiscordJS.ApplicationCommand, (typeof LocalCommands)[number]][] = [];

  for (const LocalCommand of LocalCommands) {
    const CmdName = LocalCommand.data.name;
    const AppDeployedCmd = AppCommandsMap.get(CmdName);
    const GuildExistingCmd = GuildCommandsMap.get(CmdName);

    // Handle deleted commands
    if (LocalCommand.options?.deleted) {
      if (AppDeployedCmd || GuildExistingCmd) {
        DeletedCommands.push(LocalCommand);
      } else {
        AppLogger.info({
          message: "Registering '%s' command was skipped; property 'deleted' is set to true.",
          splat: [Chalk.bold(CmdName)],
          label: LogLabel,
        });
      }
      continue;
    }

    // Handle existing commands that need updates
    if (AppDeployedCmd) {
      const CmdManager = AppDeployedCmd.manager;
      if (
        (CmdManager.constructor === ApplicationCommandManager && LocalCommand.options?.dev_only) ||
        (CmdManager.constructor === GuildApplicationCommandManager &&
          !LocalCommand.options?.dev_only)
      ) {
        await HandleCommandScopeSwitching(Client, LocalCommand, AppDeployedCmd);
        RegisterCommandInClient(Client, LocalCommand);
      } else if (
        LocalCommand.options?.force_update ||
        !CmdsAreIdentical(AppDeployedCmd, LocalCommand)
      ) {
        CommandsToUpdate.push([AppDeployedCmd, LocalCommand]);
      } else {
        RegisterCommandInClient(Client, LocalCommand);
      }
      continue;
    }

    if (GuildExistingCmd) {
      if (LocalCommand.options?.force_update || !CmdsAreIdentical(GuildExistingCmd, LocalCommand)) {
        CommandsToUpdate.push([GuildExistingCmd, LocalCommand]);
      } else {
        RegisterCommandInClient(Client, LocalCommand);
      }
      continue;
    }

    // New commands to create
    if (LocalCommand.options?.dev_only) {
      if (TestingGuild) {
        GuildOnlyCommands.push(LocalCommand);
      } else {
        AppLogger.info({
          message:
            "Registering '%s' command skipped; could not find the testing guild to register on.",
          splat: [Chalk.bold(CmdName)],
          label: LogLabel,
        });
      }
    } else {
      GlobalCommands.push(LocalCommand);
    }
  }

  return { GlobalCommands, GuildOnlyCommands, DeletedCommands, CommandsToUpdate };
}

// -----------------------------------------------------------------------------
// Helpers:
// --------
/**
 * Determines whether the provided command object is a context menu command or a slash command.
 * @param Cmd - The command object, which can be either a SlashCommandObject or a ContextMenuCommandObject.
 * @returns A string indicating whether the command is a "context menu command" or a "slash command".
 */
function SlashCmdOrContextMenuCmdText(Cmd: SlashCommandObject | ContextMenuCommandObject) {
  return Cmd.data instanceof ContextMenuCommandBuilder ? "context menu command" : "slash command";
}

/**
 * Registers a command in the appropriate client collection
 * @param Client Discord client instance
 * @param Command Command object to register
 */
function RegisterCommandInClient(
  Client: DiscordClient,
  Command: SlashCommandObject | ContextMenuCommandObject
) {
  const CommandName = Command.data.name;
  if (Command.data instanceof ContextMenuCommandBuilder) {
    Client.ctx_commands.set(CommandName, Command as ContextMenuCommandObject);
  } else {
    Client.commands.set(CommandName, Command as SlashCommandObject<SlashCommandBuilder>);
  }
}

/**
 * Processes and deletes commands that are no longer present locally but still exist in the application's or guild's command maps.
 * @param DeletedCommands - An array of local command definitions that should be deleted.
 * @param AppCommandsMap - A map of global application commands, keyed by command name.
 * @param GuildCommandsMap - A map of guild-specific application commands, keyed by command name.
 * @returns A promise that resolves when all deletions have been attempted.
 */
function ProcessDeletedCommands(
  DeletedCommands: LocalCmds,
  AppCommandsMap: Map<string, DiscordJS.ApplicationCommand>,
  GuildCommandsMap: Map<string, DiscordJS.ApplicationCommand>
): Promise<unknown> {
  return Promise.all(
    DeletedCommands.map(async (LocalCmd) => {
      const CmdName = LocalCmd.data.name;
      const ExistingCmd = AppCommandsMap.get(CmdName) || GuildCommandsMap.get(CmdName);
      const CmdManager = ExistingCmd?.manager;
      if (!CmdManager) return;

      return CmdManager.delete(ExistingCmd.id)
        .then(() => {
          AppLogger.info({
            message: "'%s' slash command has been deleted%s; property 'deleted' is set to true.",
            label: LogLabel,
            splat: [
              Chalk.bold(ExistingCmd.name),
              CmdManager instanceof GuildApplicationCommandManager ? " (guild scope)" : " globally",
            ],
          });
        })
        .catch((Err) => {
          AppLogger.error({
            label: LogLabel,
            message: "Failed to delete '%s' slash command",
            splat: [Chalk.bold(ExistingCmd.name)],
            stack: (Err as Error).stack,
          });
        });
    })
  );
}

/**
 * Updates a list of existing Discord application commands with new local command data.
 * @param Client - The Discord client instance to register updated commands with.
 * @param CommandsToUpdate - An array of tuples, each containing an existing Discord application command and its corresponding local command definition.
 * @returns A promise that resolves when all command updates have been attempted.
 */
function ProcessCommandsToUpdate(
  Client: DiscordClient,
  CommandsToUpdate: [DiscordJS.ApplicationCommand, LocalCmds[number]][]
): Promise<unknown> {
  return Promise.all(
    CommandsToUpdate.map(async ([ExistingCmd, LocalCmd]) => {
      const CmdManager = ExistingCmd.manager;
      const SlashOrContext = SlashCmdOrContextMenuCmdText(LocalCmd);
      await CmdManager.edit(ExistingCmd.id, LocalCmd.data)
        .then((Cmd) => {
          RegisterCommandInClient(Client, LocalCmd);
          AppLogger.info({
            message: "Successfully updated '%s' %s.",
            splat: [Chalk.bold(Cmd.name), SlashOrContext],
            label: LogLabel,
          });
        })
        .catch((Err) => {
          AppLogger.error({
            message: "Failed to update '%s' %s.",
            splat: [Chalk.bold(ExistingCmd.name), SlashOrContext],
            stack: (Err as Error).stack,
            label: LogLabel,
          });
        });
    })
  );
}

/**
 * Registers a set of guild-specific commands for a Discord bot.
 * @param Client - The Discord client instance used to interact with the Discord API.
 * @param TestingGuild - The guild (server) where the commands will be registered.
 * @param GuildOnlyCommands - An array of local command definitions to be registered in the guild.
 * @returns A promise that resolves when all commands have been successfully registered.
 */
async function RegisterGuildCommands(
  Client: DiscordClient,
  TestingGuild: DiscordJS.Guild,
  GuildOnlyCommands: LocalCmds
): Promise<void> {
  for (const LocalCommand of GuildOnlyCommands) {
    const SlashOrContext = SlashCmdOrContextMenuCmdText(LocalCommand);
    await TestingGuild.commands
      .create(LocalCommand.data)
      .then(() => {
        RegisterCommandInClient(Client, LocalCommand);
        AppLogger.info({
          message: "'%s' %s has been registered on '%s' server.",
          label: LogLabel,
          splat: [
            Chalk.bold(LocalCommand.data.name),
            SlashOrContext,
            Chalk.bold(TestingGuild.name),
          ],
        });
      })
      .catch((Err) => {
        AppLogger.error({
          message: "Failed to register '%s' %s.",
          splat: [Chalk.bold(LocalCommand.data.name), SlashOrContext],
          stack: (Err as Error).stack,
          label: LogLabel,
        });
      });
  }
}

/**
 * Registers global application commands for the app.
 * @param Client - The Discord client instance used to manage the bot's state.
 * @param CommandManager - The manager responsible for handling application commands.
 * @param GlobalCommands - A collection of local commands to be registered globally.
 * @returns A promise that resolves when all commands have been registered.
 */
async function RegisterGlobalCommands(
  Client: DiscordClient,
  CommandManager: DiscordJS.ApplicationCommandManager,
  GlobalCommands: LocalCmds
): Promise<void> {
  for (const LocalCommand of GlobalCommands) {
    const SlashOrContext = SlashCmdOrContextMenuCmdText(LocalCommand);
    await CommandManager.create(LocalCommand.data)
      .then(() => {
        RegisterCommandInClient(Client, LocalCommand);
        AppLogger.info({
          message: "'%s' %s has been registered globally.",
          label: LogLabel,
          splat: [Chalk.bold(LocalCommand.data.name), SlashOrContext],
        });
      })
      .catch((Err) => {
        AppLogger.error({
          message: "Failed to register '%s' %s.",
          splat: [Chalk.bold(LocalCommand.data.name), SlashOrContext],
          stack: (Err as Error).stack,
          label: LogLabel,
        });
      });
  }
}

/**
 * Handles switching the scope of a Discord application command between guild and global.
 *
 * This function deletes the existing command from its current scope (guild or global)
 * and re-creates it in the opposite scope. It updates the client's command collections
 * and logs the operation. If the command is already in the desired scope, no action is taken.
 *
 * @param Client - The Discord client instance.
 * @param LocalCmd - The local command object to register, either a slash command or context menu command.
 * @param ExistingCmd - The existing Discord.js application command to switch scope for.
 * @returns A promise that resolves when the command scope switch is complete.
 */
async function HandleCommandScopeSwitching(
  Client: DiscordClient,
  LocalCmd: SlashCommandObject | ContextMenuCommandObject,
  ExistingCmd: DiscordJS.ApplicationCommand
) {
  const OrgCmdManager = ExistingCmd.manager;
  const SwitchFrom = ExistingCmd.guildId ? "guild" : "global";
  const SwitchTo = ExistingCmd.guildId ? "global" : "guild";
  const ContextOrSlash = SlashCmdOrContextMenuCmdText(LocalCmd);

  if (
    (SwitchTo === "global" && OrgCmdManager instanceof ApplicationCommandManager) ||
    (SwitchTo === "guild" && OrgCmdManager instanceof GuildApplicationCommandManager)
  ) {
    return;
  }

  await OrgCmdManager.delete(ExistingCmd.id).catch((Err) => {
    AppLogger.error({
      message: "Failed to delete '%s' %s from %s scope; exiting with error: ",
      splat: [Chalk.bold(ExistingCmd.name), ContextOrSlash, SwitchFrom],
      stack: (Err as Error).stack,
      label: LogLabel,
      details: {
        ...(Err as Error),
      },
    });
  });

  await Client.application.commands
    .create(LocalCmd.data, SwitchTo === "guild" ? Discord.TestGuildId : undefined)
    .then((Cmd) => {
      if (LocalCmd.data instanceof ContextMenuCommandBuilder) {
        Client.ctx_commands.set(Cmd.name, LocalCmd as ContextMenuCommandObject);
      } else {
        Client.commands.set(Cmd.name, LocalCmd as SlashCommandObject<SlashCommandBuilder>);
      }

      AppLogger.info({
        label: LogLabel,
        splat: [Chalk.bold(Cmd.name), ContextOrSlash, Chalk.bold(SwitchTo), Chalk.bold(SwitchFrom)],
        message: "Switched '%s' %s scope to %s rather than %s.",
      });
    })
    .catch((Err) => {
      AppLogger.error({
        message: "Failed to switch '%s' %s scope; exiting with error: ",
        splat: [Chalk.bold(ExistingCmd.name), ContextOrSlash, OneTab + (Err as Error).stack],
        stack: (Err as Error).stack,
        label: LogLabel,
        details: {
          ...(Err as Error),
        },
      });
    });
}
