/* eslint-disable no-unused-vars */
// --------------------------------
// Dependencies:
// ------------------------------------------------------------------------------------------

const {
  Client,
  Collection,
  PermissionFlagsBits,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} = require("discord.js");

const {
  ErrorEmbed,
  WarnEmbed,
  InfoEmbed,
  UnauthorizedEmbed,
} = require("../../Utilities/General/ExtraEmbeds");

const {
  Discord: { BotDevs },
} = require("../../Json/Secrets.json");

const { UnorderedList } = require("../../Utilities/Strings/Formatter");
const { PascalToNormal } = require("../../Utilities/Strings/Converter");
const { SendErrorReply } = require("../../Utilities/General/SendReply");
const Chalk = require("chalk");
const DefaultCmdCooldownDuration = 3;

// ------------------------------------------------------------------------------------------
/**
 * The function that handles command executions
 * @param {Client} Client The bot user object
 * @param {ChatInputCommandInteraction} Interaction The command interaction
 */
module.exports = async (Client, Interaction) => {
  if (!Interaction.isChatInputCommand()) return;
  const CommandName = Interaction.commandName;
  const CommandObject = Client.commands.get(CommandName);

  try {
    if (!CommandObject) {
      return Interaction.reply({
        ephemeral: true,
        embeds: [new ErrorEmbed("Attempt execution of a non-existent command on the application.")],
      }).then(() => {
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

// ------------------------------------------------------------------------------------------
// Validation:
// -----------
/**
 * Command cooldowns for users
 * @param {Client} Client
 * @param {ChatInputCommandInteraction} Interaction
 * @param {CommandObject} CommandObject
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
  const CooldownDuration = (CommandObject.cooldown ?? DefaultCmdCooldownDuration) * 1000;

  if (Timestamps.has(Interaction.user.id)) {
    const ExpTimestamp = Timestamps.get(Interaction.user.id) + CooldownDuration;
    if (CurrentTS < ExpTimestamp) {
      return Interaction.reply({
        ephemeral: true,
        embeds: [
          new WarnEmbed()
            .setTitle("Cooldown")
            .setDescription(
              "Please wait. You are currently on a cooldown for </%s:%s> slash command.\nYou may use it again approximately <t:%s:R>.",
              CommandName,
              CommandID,
              Math.round(ExpTimestamp / 1000)
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
 * @param {CommandObject} CommandObject
 * @param {ChatInputCommandInteraction} Interaction
 */
function HandleDevOnlyCommands(CommandObject, Interaction) {
  if (Interaction.replied) return;
  if (CommandObject.devOnly && !BotDevs.includes(Interaction.member.id)) {
    return Interaction.reply({
      ephemeral: true,
      embeds: [new UnauthorizedEmbed("Only developers of this bot can run this command.")],
    });
  }
}

/**
 * Checks if the user has the necessary permissions to run the command
 * @param {CommandObject} CommandObject
 * @param {ChatInputCommandInteraction} Interaction
 */
function HandleUserPermissions(CommandObject, Interaction) {
  if (Interaction.replied) return;
  if (CommandObject.userPerms?.length) {
    const MissingPerms = [];
    for (const Permission of CommandObject.userPerms) {
      if (!Interaction.member.permissions.has(Permission)) {
        const LiteralPerm = Object.keys(PermissionFlagsBits).find(
          (Key) => PermissionFlagsBits[Key] === Permission
        );
        MissingPerms.push(PascalToNormal(LiteralPerm));
      }
    }

    if (MissingPerms.length) {
      const Plural = MissingPerms.length === 1 ? "" : "s";
      return Interaction.reply({
        ephemeral: true,
        embeds: [
          new UnauthorizedEmbed().setDescription(
            "Missing permission%s.\nYou do not have the following permission%s to run this command:\n%s",
            Plural,
            Plural,
            UnorderedList(MissingPerms)
          ),
        ],
      });
    }
  }
}

/**
 * Checks if the bot has the required permission(s) to execute the required command properly
 * @param {CommandObject} CommandObject
 * @param {ChatInputCommandInteraction} Interaction
 */
function HandleBotPermissions(CommandObject, Interaction) {
  if (Interaction.replied) return;
  if (CommandObject.botPerms?.length) {
    const BotInGuild = Interaction.guild.members.me;
    const MissingPerms = [];
    for (const Permission of CommandObject.botPerms) {
      if (!BotInGuild.permissions.has(Permission)) {
        const LiteralPerm = Object.keys(PermissionFlagsBits).find(
          (Key) => PermissionFlagsBits[Key] === Permission
        );
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
}

// ----------------------------------------------------------------
// Types:
// ------
/**
 * @typedef {Object} CommandObject
 * @property {SlashCommandBuilder} data - The data for the command
 * @property {boolean?} deleted - Indicates if the command should be deleted
 * @property {boolean?} forceUpdate - Indicates if the command needs to be forcefully updated
 * @property {boolean?} devOnly - Indicates if the command is restricted to developers only
 * @property {number?} cooldown - The cooldown duration for the command
 * @property {Array.<BigInt>?} userPerms - The required user permissions to execute the command
 * @property {Array.<BigInt>?} botPerms - The required bot permissions to execute the command
 * @property {function?} callback - The callback function for executing the command
 * @property {function?} autocomplete - The autocomplete function for providing command option suggestions
 */
