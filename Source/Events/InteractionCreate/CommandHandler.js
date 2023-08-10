/* eslint-disable no-unused-vars */
const DefaultCmdCooldownDuration = 3;
const Chalk = require("chalk");
const { UnorderedList } = require("../../Utilities/Strings/Formatter");
const { PascalToNormal } = require("../../Utilities/Strings/Converter");
const {
  ErrorEmbed,
  UnauthorizedEmbed,
  WarnEmbed,
  InfoEmbed,
} = require("../../Utilities/General/ExtraEmbeds");

const {
  Client,
  Collection,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} = require("discord.js");

const {
  Discord: { BotDevs },
} = require("../../Json/Secrets.json");

// ------------------------------------------------------------------------------------------
/**
 * The function that handles command executions
 * @param {Client} Client The bot user object
 * @param {ChatInputCommandInteraction} Interaction The command interaction
 * @returns
 */
module.exports = async (Client, Interaction) => {
  if (!Interaction.isChatInputCommand()) return;
  const Cooldowns = Client.cooldowns;
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

    if (!Cooldowns.has(CommandName)) {
      Cooldowns.set(CommandName, new Collection());
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
            new InfoEmbed("Seems like this command is still under development.").setTitle(
              "Hold up!"
            ),
          ],
        });
      }
    } else {
      throw new ReferenceError(`❎ - '${CommandName}' callback function has not been found.`);
    }
  } catch (Err) {
    const ReplyOptions = {
      ephemeral: true,
      embeds: [
        new ErrorEmbed(
          "Apologies, a server/application error occurred while executing this command. Please attempt again at a later time."
        ),
      ],
    };

    if (!Interaction.replied) {
      Interaction.reply(ReplyOptions);
    } else {
      Interaction.followUp(ReplyOptions);
    }

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
 * @returns
 */
async function HandleCooldowns(Client, Interaction, CommandObject) {
  const Now = Date.now();
  const Cooldowns = Client.cooldowns;
  const CommandID = Interaction.commandId;
  const CommandName = Interaction.commandName;
  const Timestamps = Cooldowns.get(CommandName);
  const CooldownAmount = (CommandObject.cooldown ?? DefaultCmdCooldownDuration) * 1000;

  if (Timestamps.has(Interaction.user.id)) {
    const ExpirationTime = Timestamps.get(Interaction.user.id) + CooldownAmount;
    if (Now < ExpirationTime) {
      const ExpiredTimestamp = Math.round(ExpirationTime / 1000);
      return Interaction.reply({
        ephemeral: true,
        embeds: [
          new WarnEmbed(
            `Please wait. You are currently on a cooldown for </${CommandName}:${CommandID}> slash command.\nYou may use it again approximately: <t:${ExpiredTimestamp}:R>.`
          ).setTitle("Cooldown"),
        ],
      });
    }
  }

  Timestamps.set(Interaction.user.id, Now);
  setTimeout(() => Timestamps.delete(Interaction.user.id), CooldownAmount);
}

/**
 * Checks if the command is allowed to public use or not
 * @param {CommandObject} CommandObject
 * @param {ChatInputCommandInteraction} Interaction
 * @returns
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
 * @returns
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
          new UnauthorizedEmbed(
            `Missing permission${Plural}.\nYou do not have the following permission${Plural} to run this command:\n ${UnorderedList(
              MissingPerms
            )}`
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
 * @returns
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
          new ErrorEmbed(
            `The bot lacks the following necessary permission${Plural} to perform the command:\n ${UnorderedList(
              MissingPerms
            )}`
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
