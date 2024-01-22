// Dependencies:
// -------------

import {
  time,
  Collection,
  DiscordAPIError,
  PermissionsBitField,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
} from "discord.js";

import {
  InfoEmbed,
  WarnEmbed,
  ErrorEmbed,
  UnauthorizedEmbed,
} from "@Utilities/Classes/ExtraEmbeds.js";

import { Discord } from "@Config/Secrets.js";
import { UnorderedList } from "@Utilities/Strings/Formatter.js";
import { PascalToNormal } from "@Utilities/Strings/Converter.js";
import { SendErrorReply } from "@Utilities/Other/SendReply.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import AppError from "@Utilities/Classes/AppError.js";

const DefaultCmdCooldownDuration = 3;
const LogLabel = "Events:InteractionCreate:CommandHandler";

// -----------------------------------------------------------------------------
/**
 * The function that handles command executions
 * @param Client The discord.js client
 * @param Interaction The command interaction
 */
export default async function CommandHandler(
  Client: DiscordClient,
  Interaction: ChatInputCommandInteraction
) {
  if (!Interaction.isChatInputCommand()) return;
  const CommandName = Interaction.commandName;
  const CommandObject = Client.commands.get(CommandName);
  const FullCmdName = Interaction.toString().match(/^\/([\w\- ]+)(?: \w+:.+)?$/)![1];

  try {
    if (!CommandObject) {
      return new ErrorEmbed()
        .setDescription("Attempt execution of a non-existent command on the application.")
        .replyToInteract(Interaction, true, true)
        .then(() => {
          AppLogger.warn({
            label: LogLabel,
            message:
              "Could not find the command object of slash command '%s'; terminated execution.",
            splat: [FullCmdName],
            cmd_options: Object(Interaction.options)._hoistedOptions,
          });
        });
    }

    await HandleCommandCooldowns(Client, Interaction, CommandObject);
    await HandleDevOnlyCommands(CommandObject, Interaction);
    await HandleUserPermissions(CommandObject, Interaction);
    await HandleBotPermissions(CommandObject, Interaction);
    if (Interaction.replied) return;

    if (typeof CommandObject.callback === "function") {
      await CommandObject.callback(Client, Interaction);
      if (Interaction.replied || Interaction.deferred) return;
      await Interaction.reply({
        ephemeral: true,
        embeds: [
          new InfoEmbed()
            .setTitle("Hold up!")
            .setDescription("This command appears to be still being worked on."),
        ],
      });
    } else {
      throw new ReferenceError("The command's callback function has not been found.");
    }
  } catch (Err: any) {
    if (Err instanceof DiscordAPIError && (Err.code === 40_060 || Err.code === 10_062)) {
      // Most likely this error is due to high latency issues.
      return;
    }

    AppLogger.error({
      label: LogLabel,
      stack: Err.stack,
      splat: [FullCmdName],
      message: "An error occurred while executing slash command '%s';",
      cmd_options: Object(Interaction.options)._hoistedOptions,
    });

    if (Err instanceof AppError && Err.is_showable) {
      await SendErrorReply({
        Interaction,
        Title: Err.title,
        Message: Err.message,
      });
    } else {
      await SendErrorReply({
        Interaction,
        Ephemeral: true,
        Template: "AppError",
      });
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
 */
async function HandleCommandCooldowns(
  Client: DiscordClient,
  Interaction: ChatInputCommandInteraction,
  CommandObject: SlashCommandObject
) {
  const CurrentTS = Date.now();
  const Cooldowns = Client.cooldowns;
  const CommandID = Interaction.commandId;
  const CommandName = Interaction.commandName;

  if (!Cooldowns.has(CommandName)) {
    Cooldowns.set(CommandName, new Collection());
  }

  const Timestamps = Cooldowns.get(CommandName);
  const CooldownDuration = (CommandObject.options?.cooldown ?? DefaultCmdCooldownDuration) * 1000;

  if (!Timestamps) return;
  if (Timestamps.has(Interaction.user.id)) {
    const ExpTimestamp = (Timestamps.get(Interaction.user.id) ?? 0) + CooldownDuration;
    if (CurrentTS < ExpTimestamp) {
      return Interaction.reply({
        ephemeral: true,
        embeds: [
          new WarnEmbed()
            .setTitle("Cooldown")
            .setDescription(
              "Kindly wait. You currently have a cooldown for the </%s:%s> slash command and you may use it again approximately %s.",
              CommandName,
              CommandID,
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
function HandleDevOnlyCommands(
  CommandObject: SlashCommandObject,
  Interaction: ChatInputCommandInteraction
) {
  if (Interaction.replied) return;
  if (CommandObject.options?.devOnly && !Discord.BotDevs.includes(Interaction.user.id)) {
    return new UnauthorizedEmbed()
      .setDescription("This command can only be executed by the bot's developers.")
      .replyToInteract(Interaction, true);
  }
}

/**
 * Checks if the user has the necessary permissions to run the command
 * @param CommandObject
 * @param Interaction
 */
function HandleUserPermissions(
  CommandObject: SlashCommandObject,
  Interaction: ChatInputCommandInteraction
) {
  if (Interaction.replied || !Interaction.inCachedGuild()) return;
  if (!CommandObject.options?.userPerms?.length) {
    return;
  }

  const MissingPerms: string[] = [];
  for (const Permission of CommandObject.options.userPerms) {
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
      ephemeral: true,
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
 * Checks if the bot has the required permission(s) to execute the required command properly
 * @param CommandObject
 * @param Interaction
 */
function HandleBotPermissions(
  CommandObject: SlashCommandObject,
  Interaction: ChatInputCommandInteraction
) {
  if (Interaction.replied || !Interaction.inCachedGuild()) return;
  if (!CommandObject.options?.botPerms?.length) {
    return;
  }

  const BotInGuild = Interaction.guild.members.me;
  const MissingPerms: string[] = [];

  for (const Permission of CommandObject.options.botPerms) {
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
      ephemeral: true,
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
