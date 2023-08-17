/* eslint-disable no-unused-vars */
const {
  Client,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  AutocompleteInteraction,
} = require("discord.js");

const Subcommands = [
  require("./Subcommands/Active"),
  require("./Subcommands/Admin"),
  require("./Subcommands/Leaderboard"),
  require("./Subcommands/Manage"),
  require("./Subcommands/WipeAll"),
];

const DutyTypesSubcommandGroup = require("./TypesSubcmdGroup/Main");
const AutocompleteDutyType = require("../../../Utilities/Autocompletion/DutyType");

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * @param {Client} Client
 * @param {ChatInputCommandInteraction} Interaction
 */
async function Callback(Client, Interaction) {
  const SubCommandName = Interaction.options.getSubcommand();
  const SubCommandGroupName = Interaction.options.getSubcommandGroup();

  for (const SubCommand of Subcommands) {
    if (SubCommand.data.name === SubCommandName) {
      if (typeof SubCommand.callback === "function") {
        return SubCommand.callback(Client, Interaction);
      } else {
        return;
      }
    }
  }

  if (SubCommandGroupName === "types" && typeof DutyTypesSubcommandGroup.callback === "function") {
    return DutyTypesSubcommandGroup.callback(Client, Interaction);
  }
}

/**
 * Autocompletion for the Roblox username required command option
 * @param {AutocompleteInteraction} Interaction
 * @returns {Promise<void>}
 */
async function Autocomplete(Interaction) {
  const { name, value } = Interaction.options.getFocused(true);
  const SubcommandGroup = Interaction.options.getSubcommandGroup();
  const SubcommandName = Interaction.options.getSubcommand();
  let Suggestions;

  if (name === "type") {
    Suggestions = await AutocompleteDutyType(value, Interaction);
  } else if (name === "name" && SubcommandGroup === "types" && SubcommandName === "delete") {
    Suggestions = await AutocompleteDutyType(value, Interaction);
  } else {
    Suggestions = [];
  }

  return Interaction.respond(Suggestions);
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  // strictUpdate: true,
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("duty")
    .setDescription("Duty related actions.")
    .addSubcommandGroup(DutyTypesSubcommandGroup.data),

  callback: Callback,
  autocomplete: Autocomplete,
};

// ---------------------------------------------------------------------------------------
for (const SubCommand of Subcommands) {
  CommandObject.data.addSubcommand(SubCommand.data);
}

// ---------------------------------------------------------------------------------------
module.exports = CommandObject;
