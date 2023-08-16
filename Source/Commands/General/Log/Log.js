// eslint-disable-next-line no-unused-vars
const { Client, ChatInputCommandInteraction, SlashCommandBuilder } = require("discord.js");
const AutocompleteHeight = require("../../../Utilities/Autocompletion/Height.js");
const AutocompleteUsername = require("../../../Utilities/Autocompletion/Username.js");
const AutocompleteWeight = require("../../../Utilities/Autocompletion/Weight.js");
const SubCommands = [
  require("./Deps/CitFine.js"),
  require("./Deps/CitWarn.js"),
  require("./Deps/Arrest.js"),
];
// const VehicleModels = require("../../../Json/ERLCVehicles.json");

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * @param {Client} Client
 * @param {ChatInputCommandInteraction} Interaction
 */
async function Callback(Client, Interaction) {
  for (const SubCommand of SubCommands) {
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
  let Suggestions;

  if (name === "height") {
    Suggestions = AutocompleteHeight(value);
  } else if (name === "name") {
    Suggestions = await AutocompleteUsername(value);
  } else if (name === "weight") {
    Suggestions = AutocompleteWeight(value);
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
    .setName("log")
    .setDescription("Logs a particular information.")
    .addSubcommand(SubCommands[0].data)
    .addSubcommand(SubCommands[1].data)
    .addSubcommand(SubCommands[2].data),

  callback: Callback,
  autocomplete: Autocomplete,
};

// ---------------------------------------------------------------------------------------
module.exports = CommandObject;
