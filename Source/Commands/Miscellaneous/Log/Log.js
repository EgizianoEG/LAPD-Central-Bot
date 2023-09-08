const { SlashCommandBuilder } = require("discord.js");
const AutocompleteHeight = require("../../../Utilities/Autocompletion/Height.js");
const AutocompleteUsername = require("../../../Utilities/Autocompletion/Username.js");
const AutocompleteWeight = require("../../../Utilities/Autocompletion/Weight.js");
const AutocompleteVehicle = require("../../../Utilities/Autocompletion/Vehicle.js");

const Subcommands = [
  require("./Deps/CitFine.js"),
  require("./Deps/CitWarn.js"),
  require("./Deps/Arrest.js"),
];

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * @param {DiscordClient} Client
 * @param {SlashCommandInteraction} Interaction
 */
async function Callback(Client, Interaction) {
  for (const SubCommand of Subcommands) {
    if (SubCommand.data.name === Interaction.options.getSubcommand()) {
      if (typeof SubCommand.callback === "function") {
        return SubCommand.callback(Client, Interaction);
      } else {
        break;
      }
    }
  }
}

async function Autocomplete(Interaction) {
  const { name, value } = Interaction.options.getFocused(true);
  let Suggestions = [];

  if (name === "height") {
    Suggestions = AutocompleteHeight(value);
  } else if (name === "name") {
    Suggestions = await AutocompleteUsername(value);
  } else if (name === "weight") {
    Suggestions = AutocompleteWeight(value);
  } else if (name === "vehicle") {
    Suggestions = AutocompleteVehicle(value);
  }

  return Interaction.respond(Suggestions);
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
/** @type {SlashCommandObject<any>} */
const CommandObject = {
  data: new SlashCommandBuilder()
    .setName("log")
    .setDescription("Logs a particular information.")
    .setDMPermission(false)
    .addSubcommand(Subcommands[0].data)
    .addSubcommand(Subcommands[1].data)
    .addSubcommand(Subcommands[2].data),

  callback: Callback,
  autocomplete: Autocomplete,
  options: {},
};

// ---------------------------------------------------------------------------------------
module.exports = CommandObject;
