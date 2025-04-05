import {
  time,
  CacheType,
  Collection,
  GuildMember,
  MessageFlags,
  PermissionsBitField,
  PermissionFlagsBits,
  PermissionResolvable,
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
} from "discord.js";

import { Discord } from "@Config/Secrets.js";
import { UnorderedList } from "@Utilities/Strings/Formatters.js";
import { PascalToNormal } from "@Utilities/Strings/Converters.js";
import { IsValidUserPermsObj } from "@Utilities/Other/Validators.js";
import { WarnEmbed, ErrorEmbed, UnauthorizedEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import UserHasPerms from "@Utilities/Database/UserHasPermissions.js";
import Dedent from "dedent";

const BaseCommandCooldownTime = 3;
const AllOtherCmdNamesPattern = /^\$all(?:_other)?$|^\$other(?:_cmds)?$/;
type ChatContextCmdObject = SlashCommandObject | ContextMenuCommandObject;
type ChatContextCmdInteraction<Cached extends CacheType = CacheType> =
  | ChatInputCommandInteraction<Cached>
  | ContextMenuCommandInteraction<Cached>;

/**
 * Handles command cooldowns for both slash commands and context menu commands.
 * @param Client - The Discord client instance.
 * @param Interaction - The command interaction (chat input or context menu).
 * @param CommandObject - The command object (slash or context menu).
 * @param CommandName - The full name of the command.
 */
export async function HandleCommandCooldowns(
  Client: DiscordClient,
  Interaction: ChatContextCmdInteraction,
  CommandObject: SlashCommandObject | ContextMenuCommandObject,
  CommandName: string
) {
  if (Interaction.replied) return;
  const CurrentTS = Date.now();
  const Cooldowns = Client.cooldowns;
  const CommandID = Interaction.commandId;

  if (!Cooldowns.has(CommandName)) {
    Cooldowns.set(CommandName, new Collection());
  }

  const Timestamps = Cooldowns.get(CommandName);
  let CommandCooldownTimeMs: number = BaseCommandCooldownTime * 1000;

  if (CommandObject.options?.cooldown) {
    if (typeof CommandObject.options.cooldown === "number") {
      CommandCooldownTimeMs = CommandObject.options.cooldown * 1000;
    } else if (Interaction.isChatInputCommand()) {
      const RunningCmdGS =
        Interaction.options.getSubcommandGroup(false) ?? Interaction.options.getSubcommand(false);

      if (RunningCmdGS) {
        const MatchingSubcmdCooldown = CommandObject.options.cooldown[RunningCmdGS];
        if (MatchingSubcmdCooldown) {
          CommandCooldownTimeMs = MatchingSubcmdCooldown * 1000;
        } else {
          // Handle special cases like '$all_other', '$other_cmds', etc.
          const CooldownFallbackKey = Object.keys(CommandObject.options.cooldown).find(
            (key) => !!key.match(AllOtherCmdNamesPattern)
          );

          if (CooldownFallbackKey) {
            CommandCooldownTimeMs = CommandObject.options.cooldown[CooldownFallbackKey] * 1000;
          }
        }
      }
    }
  }

  if (!Timestamps) return;
  if (Timestamps.has(Interaction.user.id)) {
    const ExpTimestamp = (Timestamps.get(Interaction.user.id) ?? 0) + CommandCooldownTimeMs;
    if (CurrentTS < ExpTimestamp) {
      const IsSlashCommand = Interaction.isChatInputCommand();

      return Interaction.reply({
        flags: MessageFlags.Ephemeral,
        embeds: [
          new WarnEmbed()
            .setTitle("Cooldown")
            .setDescription(
              IsSlashCommand
                ? "Kindly wait. You currently have a cooldown for the %s slash command and may use it again %s."
                : "Kindly wait. You currently have a cooldown for the `%s` context menu command and may use it again %s.",
              IsSlashCommand ? `</${CommandName}:${CommandID}>` : CommandName,
              time(Math.round(ExpTimestamp / 1000), "R")
            ),
        ],
      });
    }
  }

  Timestamps.set(Interaction.user.id, CurrentTS);
  setTimeout(() => Timestamps.delete(Interaction.user.id), CommandCooldownTimeMs);
}

/**
 * Handles the execution of commands that are restricted to the application developers only.
 * @param CommandObject - The command object containing metadata and options for the command.
 * @param Interaction - The interaction object representing the command invocation, which can be
 *                      either a `ChatInputCommandInteraction` or `ContextMenuCommandInteraction`.
 * @returns A promise that resolves to an unauthorized embed reply if the user is not authorized
 * to execute the command, or nothing if the interaction has already been replied to or the user
 * is authorized.
 *
 * @remarks
 * - This function checks if the command is marked as developer-only (`dev_only`) and verifies
 *   if the user invoking the command is either listed in the bot's developers or is the bot's
 *   application owner.
 * - If the user is unauthorized, an embed message is sent as a reply to the interaction,
 *   indicating that only the (bot/application)'s developers can execute the command.
 */
export async function HandleDevOnlyCommands(
  CommandObject: ChatContextCmdObject,
  Interaction: ChatContextCmdInteraction
) {
  if (Interaction.replied) return;
  if (
    CommandObject.options?.dev_only &&
    !Discord.BotDevs.includes(Interaction.user.id) &&
    Interaction.client.application.owner?.id !== Interaction.user.id
  ) {
    return new UnauthorizedEmbed()
      .useErrTemplate("UnauthorizedAccessDev")
      .replyToInteract(Interaction, true);
  }
}

/**
 * Handles user permissions for a given command interaction.
 * This function validates and enforces the user permissions required to execute a command.
 * It supports various permission structures, including arrays, objects, and special keys
 * for handling subcommands and fallback permissions.
 *
 * @param CommandObject - The command object containing metadata and options for the command.
 * @param Interaction - The interaction object representing the user's command input.
 *                      This can be a `ChatInputCommandInteraction` or `ContextMenuCommandInteraction`.
 * @returns A promise that resolves when the permission handling is complete.
 *          If the user lacks the required permissions, the function may terminate early.
 *
 * @remarks
 * - If the interaction has already been replied to or is not in a cached guild, the function exits early.
 * - The function supports the following permission structures:
 *   - `user_perms` as an array: Validates the array of permissions.
 *   - `user_perms` as an object: Handles permissions for specific subcommands or subcommand groups.
 *   - Special keys like `$all_other`, `$other_cmds`, `$all`, and `$other` are used to define fallback permissions.
 * - Subcommands and subcommand groups are checked for specific permissions if applicable.
 * - If no specific permissions are found, the function attempts to match special keys using a predefined pattern.
 */
export async function HandleUserPermissions(
  CommandObject: ChatContextCmdObject,
  Interaction: ChatContextCmdInteraction
) {
  if (Interaction.replied || !Interaction.inCachedGuild()) return;
  if (
    !CommandObject.options?.user_perms ||
    (Array.isArray(CommandObject.options?.user_perms) && !CommandObject.options?.user_perms.length)
  ) {
    return;
  }

  if (Array.isArray(CommandObject.options.user_perms)) {
    return ValidateUserPermissionsArray(CommandObject.options.user_perms, Interaction);
  }

  if (IsValidUserPermsObj(CommandObject.options.user_perms)) {
    return HandleCommandUserPerms(CommandObject.options.user_perms as any, Interaction);
  }

  if (Interaction.isChatInputCommand()) {
    const SubCmdGroup = Interaction.options.getSubcommandGroup(false);
    const SubCommand = Interaction.options.getSubcommand(false);

    if (SubCmdGroup && Object.hasOwn(CommandObject.options.user_perms, SubCmdGroup)) {
      return HandleCommandUserPerms(CommandObject.options.user_perms[SubCmdGroup], Interaction);
    }

    if (SubCommand && Object.hasOwn(CommandObject.options.user_perms, SubCommand)) {
      return HandleCommandUserPerms(CommandObject.options.user_perms[SubCommand], Interaction);
    }
  }

  // Handle '$all_other', '$other_cmds', '$all', as well as '$other' as special cases where
  // these keys specify the permissions needed for all other subcommands not mentioned
  // above in the user perms object structure.
  const MatchingKeyFA = Object.keys(CommandObject.options.user_perms).find(
    (key) => !!key.match(AllOtherCmdNamesPattern)
  );

  if (MatchingKeyFA) {
    return HandleCommandUserPerms(CommandObject.options.user_perms[MatchingKeyFA], Interaction);
  }
}

/**
 * Checks if the bot has the necessary permissions to perform a command.
 * @param CommandObject - The command object containing metadata and options for the command.
 * @param Interaction - The interaction object representing the user's command input.
 * @returns A promise that resolves when the permission handling is complete.
 *          If the bot lacks any necessary permissions, the function may terminate early with a feedback reply to the user.
 */
export async function HandleBotPermissions(
  CommandObject: ChatContextCmdObject,
  Interaction: ChatContextCmdInteraction
) {
  if (Interaction.replied || !Interaction.inCachedGuild()) return;
  if (!CommandObject.options?.bot_perms || !Object.keys(CommandObject.options.bot_perms).length) {
    return;
  }

  const BotInGuild = await Interaction.guild.members.fetch(Interaction.client.user.id);
  if (!BotInGuild) {
    return new ErrorEmbed()
      .useErrTemplate("AppNotFoundInGuildForPerms")
      .replyToInteract(Interaction, true);
  }

  if (Array.isArray(CommandObject.options.bot_perms)) {
    return ValidateBotPermissionsArray(BotInGuild, CommandObject.options.bot_perms, Interaction);
  }

  if (!(Interaction instanceof ChatInputCommandInteraction)) return;
  const SubCmdGroup = Interaction.options.getSubcommandGroup(false);
  const SubCommand = Interaction.options.getSubcommand(false);

  if (SubCmdGroup && Array.isArray(CommandObject.options.bot_perms[SubCmdGroup])) {
    return ValidateBotPermissionsArray(
      BotInGuild,
      CommandObject.options.bot_perms[SubCmdGroup],
      Interaction
    );
  }

  if (SubCommand && Array.isArray(CommandObject.options.bot_perms[SubCommand])) {
    return ValidateBotPermissionsArray(
      BotInGuild,
      CommandObject.options.bot_perms[SubCommand],
      Interaction
    );
  }
}

/**
 * Checks if a user has the required permissions to run a command and returns an promise for a reply message if any permissions are missing.
 * @param {PermissionResolvable[]} PermsArray - An array of permissions to check for.
 * @param {ChatContextCmdInteraction<"cached">} Interaction - The slash command interaction object received.
 * @returns
 */
export async function ValidateUserPermissionsArray(
  PermsArray: PermissionResolvable[],
  Interaction: ChatContextCmdInteraction<"cached">
) {
  const MissingPerms: string[] = [];
  for (const Permission of PermsArray) {
    if (!Interaction.member.permissions.has(Permission)) {
      const LiteralPerm =
        Object.keys(PermissionFlagsBits).find((Key) => PermissionFlagsBits[Key] === Permission) ??
        "[Unknown]";
      MissingPerms.push(PascalToNormal(LiteralPerm));
    }
  }

  if (MissingPerms.length) {
    const Plural = MissingPerms.length === 1 ? "" : "s";
    return Interaction.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [
        new UnauthorizedEmbed().setDescription(
          "Missing user permission%s.\nYou do not have the following permission%s to run this command:\n%s",
          Plural,
          Plural,
          UnorderedList(MissingPerms)
        ),
      ],
    });
  }
}

/**
 * Checks if the app has the necessary permissions to perform a command and returns an promis to the error reply message if any permissions are missing.
 * @param {GuildMember} BotInGuild - The guild member object of the bot in the guild where the command is being executed.
 * @param {PermissionResolvable[]} PermsArray - An array of `PermissionResolvable` values. These values represent the permissions that the bot needs to have in order to perform a specific command.
 * @param {ChatContextCmdInteraction<"cached">} Interaction - The slash command interaction object received.
 * @returns a reply to the interaction with an error message if the bot lacks any necessary
 * permissions. If there are missing permissions, it will reply with an ephemeral message containing an
 * error embed that lists the missing permissions. If there are no missing permissions, the function
 * does not return anything.
 */
export async function ValidateBotPermissionsArray(
  BotInGuild: GuildMember,
  PermsArray: PermissionResolvable[],
  Interaction: ChatContextCmdInteraction<"cached">
) {
  const MissingPerms: string[] = [];
  for (const Permission of PermsArray) {
    if (
      BotInGuild?.permissions instanceof PermissionsBitField &&
      !BotInGuild.permissions.has(Permission)
    ) {
      const LiteralPerm =
        Object.keys(PermissionFlagsBits).find((Key) => PermissionFlagsBits[Key] === Permission) ??
        "[Unknown]";
      MissingPerms.push(PascalToNormal(LiteralPerm));
    }
  }

  if (MissingPerms.length) {
    const Plural = MissingPerms.length === 1 ? "" : "s";
    return Interaction.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [
        new ErrorEmbed().setDescription(
          "The bot lacks the following necessary permission%s to perform this command:\n%s",
          Plural,
          UnorderedList(MissingPerms)
        ),
      ],
    });
  }
}

/**
 * The function `HandleSubcommandUserPerms` checks if a user has the required permissions to use a
 * command and returns an unauthorized embed if they do not.
 * @param {NonNullable<CommandObjectOptions["bot_perms"]>} Perms - The permissions required for a member/user to execute a command. It could be an array of permissions or an object representing specific permissions.
 * @param {ChatContextCmdInteraction<"cached">} Interaction - The slash command interaction object received.
 * @returns
 */
export async function HandleCommandUserPerms(
  Perms: NonNullable<CommandObjectOptions["bot_perms"]>,
  Interaction: ChatContextCmdInteraction<"cached">
) {
  if (Array.isArray(Perms)) {
    return ValidateUserPermissionsArray(Perms, Interaction);
  }

  if (!IsValidUserPermsObj(Perms)) {
    return;
  }

  const [HasPerms, MissingPerms] = await UserHasPerms(Interaction, Perms, true);
  let MissingListed: string;

  if (!HasPerms) {
    if (MissingPerms.length > 1) {
      const OrAndMissingPermIndex = MissingPerms.findIndex((P) => !!P.match(/\b(?:and|or)\b/i));
      const OtherMissingPerms = MissingPerms.filter((P) => !P.match(/\b(?:and|or)\b/i));
      if (OrAndMissingPermIndex >= 0) {
        MissingListed =
          MissingPerms[OrAndMissingPermIndex].replace(/^(.+)\s(and|or)\s(.+)/i, "$1; $2\n- $3") +
          "\n- " +
          OtherMissingPerms.join("\n- ");
      } else {
        MissingListed = `- ${OtherMissingPerms.join("\n- ")}`;
      }
    } else {
      MissingListed = MissingPerms[0].replace(/^(.+)\s(and|or)\s(.+)$/i, "$1; $2\n- $3");
    }

    const PluralSuffix = MissingPerms.length === 1 ? "" : "s";
    return new UnauthorizedEmbed()
      .setDescription(
        Dedent(`
          You do not have the necessary permission${PluralSuffix} to utilize this command.
          Permission${PluralSuffix} Required:
          - ${MissingListed.replaceAll("\n", `\n${" ".repeat(10)}`)}
        `)
      )
      .replyToInteract(Interaction, true);
  }
}
