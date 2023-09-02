// Dependencies:
// -------------

const {
  ErrorEmbed,
  WarnEmbed,
  InfoEmbed,
  UnauthorizedEmbed,
} = require("../../Utilities/Classes/ExtraEmbeds");

const { Discord } = require("../../Config/Secrets.json");
const { Collection, PermissionFlagsBits, PermissionsBitField, time } = require("discord.js");
const { UnorderedList } = require("../../Utilities/Strings/Formatter");
const { PascalToNormal } = require("../../Utilities/Strings/Converter");
const { SendErrorReply } = require("../../Utilities/Other/SendReply");
const Chalk = require("chalk");
const DefaultCmdCooldownDuration = 3;

// -----------------------------------------------------------------------------
/**
 * The function that handles command executions
 * @param {DiscordClient} Client The bot user object
 * @param {SlashCommandInteraction} Interaction The command interaction
 */
module.exports = async (Client, Interaction) => {
  if (!Interaction.isChatInputCommand()) return;
  const CommandName = Interaction.commandName;
  const CommandObject = Client.commands.get(CommandName);

  try {
    if (!CommandObject) {
      return new ErrorEmbed()
        .setDescription("Attempt execution of a non-existent command on the application.")
        .replyToInteract(Interaction, true)
        .then(() => {
          console.log(
            "⚠️  - Could not find command object of command '%s'; skipping execution.",
            Chalk.bold(Interaction.commandName)
          );
        });
    }

    await HandleCooldowns(Client, Interaction, CommandObject);
    await HandleDevOnlyCommands(CommandObject, Interaction);
    await HandleUserPermissions(CommandObject, Interaction);
    await HandleBotPermissions(CommandObject, Interaction);
    if (Interaction.replied) return;

    // Execute the command's callback function if it exists
    if (typeof CommandObject.callback === "function") {
      await CommandObject.callback(Client, Interaction);
      if (!Interaction.replied) {
        Interaction.reply({
          ephemeral: true,
          embeds: [
            new InfoEmbed()
              .setTitle("Hold up!")
              .setDescription("Seems like this command is still under development."),
          ],
        });
      }
    } else {
      throw new ReferenceError(`❎ - '${CommandName}' callback function has not been found.`);
    }
  } catch (Err) {
    SendErrorReply({
      Interact: Interaction,
      Ephemeral: true,
      Template: "AppError",
    });

    console.log(
      "%s:%s - An error occurred;\n",
      Chalk.yellow("InteractionCreate"),
      Chalk.red("CommandHandler"),
      Err
    );
  }
};

// -----------------------------------------------------------------------------
// Validation:
// -----------
/**
 * Command cooldowns for users
 * @param {DiscordClient} Client
 * @param {SlashCommandInteraction} Interaction
 * @param {SlashCommandObject} CommandObject
 */
async function HandleCooldowns(Client, Interaction, CommandObject) {
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
    const ExpTimestamp = Timestamps.get(Interaction.user.id) + CooldownDuration;
    if (CurrentTS < ExpTimestamp) {
      return Interaction.reply({
        ephemeral: true,
        embeds: [
          new WarnEmbed()
            .setTitle("Cooldown")
            .setDescription(
              "Please wait. You are currently on a cooldown for </%s:%s> slash command.\nYou may use it again approximately %s.",
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
 * @param {SlashCommandObject} CommandObject
 * @param {SlashCommandInteraction} Interaction
 */
function HandleDevOnlyCommands(CommandObject, Interaction) {
  if (Interaction.replied) return;
  if (CommandObject.options?.devOnly && !Discord.BotDevs.includes(Interaction.user.id)) {
    return new UnauthorizedEmbed()
      .setDescription("Only developers of this bot can run this command.")
      .replyToInteract(Interaction, true);
  }
}

/**
 * Checks if the user has the necessary permissions to run the command
 * @param {SlashCommandObject} CommandObject
 * @param {SlashCommandInteraction} Interaction
 */
function HandleUserPermissions(CommandObject, Interaction) {
  if (Interaction.replied || !Interaction.inCachedGuild()) return;
  if (!CommandObject.options?.userPerms?.length) {
    return;
  }

  const MissingPerms = [];
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
 * @param {SlashCommandObject} CommandObject
 * @param {SlashCommandInteraction} Interaction
 */
function HandleBotPermissions(CommandObject, Interaction) {
  if (Interaction.replied || !Interaction.inCachedGuild()) return;
  if (!CommandObject.options?.botPerms?.length) {
    return;
  }

  const BotInGuild = Interaction.guild.members.me;
  const MissingPerms = [];
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
          "The bot lacks the following necessary permission%s to perform the command:\n%s",
          Plural,
          UnorderedList(MissingPerms)
        ),
      ],
    });
  }
}
