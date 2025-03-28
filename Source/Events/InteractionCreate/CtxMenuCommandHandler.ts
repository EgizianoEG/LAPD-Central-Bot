// Dependencies:
// -------------

import {
  time,
  Collection,
  GuildMember,
  MessageFlags,
  PermissionsBitField,
  PermissionFlagsBits,
  PermissionResolvable,
  ContextMenuCommandInteraction,
} from "discord.js";

import {
  InfoEmbed,
  WarnEmbed,
  ErrorEmbed,
  UnauthorizedEmbed,
} from "@Utilities/Classes/ExtraEmbeds.js";

import { Discord } from "@Config/Secrets.js";
import { GetErrorId } from "@Utilities/Strings/Random.js";
import { UnorderedList } from "@Utilities/Strings/Formatters.js";
import { PascalToNormal } from "@Utilities/Strings/Converters.js";
import { IsValidUserPermsObj } from "@Utilities/Other/Validators.js";

import UserHasPerms from "@Utilities/Database/UserHasPermissions.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import AppError from "@Utilities/Classes/AppError.js";
import Dedent from "dedent";

const DefaultCmdCooldownDuration = 3;
const LogLabel = "Events:InteractionCreate:ContextMenuCommandHandler";

// -----------------------------------------------------------------------------
/**
 * The function that handles *conext menu command* executions
 * @param Client The discord.js client
 * @param Interaction The command interaction
 */
export default async function ContextMenuCommandHandler(
  Client: DiscordClient,
  Interaction: ContextMenuCommandInteraction
) {
  if (!Interaction.isContextMenuCommand()) return;
  const CommandName = Interaction.commandName;
  const CommandObject = Client.ctx_commands.get(CommandName);

  try {
    if (!CommandObject) {
      AppLogger.warn({
        message:
          "Could not find the command object of context menu command %o; terminating command execution.",
        label: LogLabel,
        splat: [CommandName],
      });

      return new ErrorEmbed()
        .setDescription(
          "Attempt execution of a non-registered context menu command on the application."
        )
        .replyToInteract(Interaction, true);
    }

    await HandleCommandCooldowns(Client, Interaction, CommandObject, CommandName);
    await HandleDevOnlyCommands(CommandObject, Interaction);
    await HandleUserPermissions(CommandObject, Interaction);
    await HandleBotPermissions(CommandObject, Interaction);
    if (Interaction.replied) return;

    if (typeof CommandObject.callback === "function") {
      if (CommandObject.callback.length > 1) {
        await (CommandObject.callback as AnyCtxMenuCmdCallback)(Client, Interaction);
      } else {
        await (CommandObject.callback as AnyCtxMenuCmdCallback)(Interaction);
      }

      AppLogger.debug({
        message: "Handled execution of context menu command %o.",
        label: LogLabel,
        splat: [CommandName],
      });

      if (Interaction.replied || Interaction.deferred) return;
      await Interaction.reply({
        flags: MessageFlags.Ephemeral,
        embeds: [
          new InfoEmbed()
            .setTitle("Hold up!")
            .setDescription("This command appears to be still being worked on."),
        ],
      });
    } else {
      throw new ReferenceError(
        `The '${CommandName}' context command callback function could not be found.`
      );
    }
  } catch (Err: any) {
    const ErrorId = GetErrorId();
    AppLogger.error({
      message: "An error occurred while executing context menu command %o;",
      label: LogLabel,
      error_id: ErrorId,
      stack: Err.stack,
      splat: [CommandName],
    });

    if (Err instanceof AppError && Err.is_showable) {
      await new ErrorEmbed()
        .setTitle(Err.title)
        .setErrorId(ErrorId)
        .setDescription(Err.message)
        .replyToInteract(Interaction, true);
    } else {
      await new ErrorEmbed()
        .useErrTemplate("AppError")
        .setErrorId(ErrorId)
        .replyToInteract(Interaction, true);
    }
  }
}

// -----------------------------------------------------------------------------
// Validation Helpers:
// -------------------
/**
 * Command cooldowns for users
 * @param Client
 * @param CommandObject
 * @param Interaction
 * @param CommandName - The name of the context menu command.
 */
async function HandleCommandCooldowns(
  Client: DiscordClient,
  Interaction: ContextMenuCommandInteraction,
  CommandObject: ContextMenuCommandObject,
  CommandName: string
) {
  if (Interaction.replied) return;
  const CurrentTS = Date.now();
  const Cooldowns = Client.cooldowns;

  if (!Cooldowns.has(CommandName)) {
    Cooldowns.set(CommandName, new Collection());
  }

  const Timestamps = Cooldowns.get(CommandName);
  const CooldownDuration: number =
    CommandObject.options?.cooldown && typeof CommandObject.options.cooldown === "number"
      ? CommandObject.options.cooldown * 1000
      : DefaultCmdCooldownDuration * 1000;

  if (!Timestamps) return;
  if (Timestamps.has(Interaction.user.id)) {
    const ExpTimestamp = (Timestamps.get(Interaction.user.id) ?? 0) + CooldownDuration;
    if (CurrentTS < ExpTimestamp) {
      return Interaction.reply({
        flags: MessageFlags.Ephemeral,
        embeds: [
          new WarnEmbed()
            .setTitle("Cooldown")
            .setDescription(
              "Kindly wait. You currently have a cooldown for the `%s` context menu command and you may use it again approximately %s.",
              CommandName,
              time(Math.round(ExpTimestamp / 1000), "R")
            ),
        ],
      });
    }
  }

  Timestamps.set(Interaction.user.id, CurrentTS);
  setTimeout(() => Timestamps.delete(Interaction.user.id), CooldownDuration);
}

/**
 * Checks if the command is allowed to public use or not
 * @param CommandObject
 * @param Interaction
 */
async function HandleDevOnlyCommands(
  CommandObject: ContextMenuCommandObject,
  Interaction: ContextMenuCommandInteraction
) {
  if (Interaction.replied) return;
  if (
    CommandObject.options?.dev_only &&
    !Discord.BotDevs.includes(Interaction.user.id) &&
    Interaction.client.application.owner?.id !== Interaction.user.id
  ) {
    return new UnauthorizedEmbed()
      .setDescription("Only the bot's developers can execute this command.")
      .replyToInteract(Interaction, true);
  }
}

/**
 * Checks if the user has the necessary permissions to run the command.
 * @param CommandObject
 * @param Interaction
 * @returns
 */
async function HandleUserPermissions(
  CommandObject: ContextMenuCommandObject,
  Interaction: ContextMenuCommandInteraction
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

  // Handle '$all_other', '$other_cmds', '$all', as well as '$other' as a special case
  // where these keys specify the permissions needed for all other subcommands not mentioned
  // above in the user perms object structure.
  const MatchingKeyFA = Object.keys(CommandObject.options.user_perms).find(
    (key) => !!key.match(/^\$all(?:_other)?$|^\$other(?:_cmds)?$/)
  );

  if (MatchingKeyFA) {
    return HandleCommandUserPerms(CommandObject.options.user_perms[MatchingKeyFA], Interaction);
  }
}

/**
 * Checks if the bot has the required permission(s) to execute the required command properly
 * @param CommandObject
 * @param Interaction
 */
async function HandleBotPermissions(
  CommandObject: ContextMenuCommandObject,
  Interaction: ContextMenuCommandInteraction
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
}

/**
 * Checks if a user has the required permissions to run a command and returns an promise for a reply message if any permissions are missing.
 * @param {PermissionResolvable[]} PermsArray - An array of permissions to check for.
 * @param Interaction - The context menu command interaction object received.
 * @returns
 */
async function ValidateUserPermissionsArray(
  PermsArray: PermissionResolvable[],
  Interaction: ContextMenuCommandInteraction<"cached">
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
 * @param Interaction - The context menu command interaction object received.
 * @returns a reply to the interaction with an error message if the bot lacks any necessary
 * permissions. If there are missing permissions, it will reply with an ephemeral message containing an
 * error embed that lists the missing permissions. If there are no missing permissions, the function
 * does not return anything.
 */
async function ValidateBotPermissionsArray(
  BotInGuild: GuildMember,
  PermsArray: PermissionResolvable[],
  Interaction: ContextMenuCommandInteraction<"cached">
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
 * @param Perms - The permissions required for a member/user to execute a command. It could be an array of permissions or an object representing specific permissions.
 * @param Interaction - The context menu command interaction object received.
 * @returns
 */
async function HandleCommandUserPerms(
  Perms: NonNullable<CommandObjectOptions["bot_perms"]>,
  Interaction: ContextMenuCommandInteraction<"cached">
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

    return new UnauthorizedEmbed()
      .setDescription(
        Dedent(`
          You do not have the necessary permission(s) to utilize this command.
          Permission(s) Required:
          - ${MissingListed.replaceAll("\n", `\n${" ".repeat(10)}`)}
        `)
      )
      .replyToInteract(Interaction, true);
  }
}
