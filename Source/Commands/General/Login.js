// TODO: Roblox verification command:
// using blob (description), follow, friendship or by joinig a game

const {
  Client,
  EmbedBuilder,
  Colors,
  inlineCode,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandStringOption,
  AutocompleteInteraction,
} = require("discord.js");

const { ErrorEmbed } = require("../../Utilities/General/ExtraEmbeds");
const IsUserLoggedIn = require("../../Utilities/Database/IsUserLoggedIn");
const AutocompleteUsername = require("../../Utilities/Autocompletion/Username");

// ------------------------------------------------------------------------------------
// Functions:
// -----------
/**
 * The main callback for the command
 * @param {Client} Client
 * @param {ChatInputCommandInteraction} Interaction
 */
async function Callback(Client, Interaction) {
  const RobloxUsername = Interaction.options.getString("username");
  const UserLoggedIn = IsUserLoggedIn(Interaction.user);

  if (UserLoggedIn) {
    const ReplyEmbed = new ErrorEmbed(`You have already logged in as ${inlineCode(UserLoggedIn)}`);
    return Interaction.reply({ embeds: [ReplyEmbed], ephemeral: true });
  }

  const ReplyEmbed = new EmbedBuilder().setTitle("Login process.").setColor(Colors.DarkerGrey);
}

/**
 * Autocompletion for the command option(s)
 * @param {AutocompleteInteraction} Interaction
 */
async function Autocomplete(Interaction) {
  const { name, value } = Interaction.options.getFocused(true);
  let Suggestions;

  if (name === "username") {
    Suggestions = await AutocompleteUsername(value);
  } else {
    Suggestions = [];
  }

  return Interaction.respond(Suggestions);
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName("login")
    .setDescription("Login into the application.")
    .addStringOption((Option) =>
      Option.setName("username")
        .setDescription("Roblox username to log in as.")
        .setMinLength(3)
        .setMaxLength(20)
        .setRequired(true)
        .setAutocomplete(true)
    ),
  autocomplete: Autocomplete,
  callback: Callback,
};

// ---------------------------------------------------------------------------------------
module.exports = CommandObject;
