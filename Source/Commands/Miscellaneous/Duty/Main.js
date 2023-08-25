/* eslint-disable no-unused-vars */
const {
  Client,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  AutocompleteInteraction,
} = require("discord.js");

const Subcommands = [
  require("./Subcmds/Active"),
  require("./Subcmds/Admin"),
  require("./Subcmds/Leaderboard"),
  require("./Subcmds/Manage"),
  require("./Subcmds/WipeAll"),
];

const DutyTypesSubcommandGroup = require("./Duty Types/Main");
const AutocompleteShiftType = require("../../../Utilities/Autocompletion/ShiftType");

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * @param {Client} Client
 * @param {ChatInputCommandInteraction} Interaction
 */
function Callback(Client, Interaction) {
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
    Suggestions = await AutocompleteShiftType(value, Interaction.guildId);
  } else if (name === "name" && SubcommandGroup === "types" && SubcommandName === "delete") {
    Suggestions = await AutocompleteShiftType(value, Interaction.guildId);
  } else {
    Suggestions = [];
  }

  return Interaction.respond(Suggestions);
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
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
