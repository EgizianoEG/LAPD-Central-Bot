/* eslint-disable no-unused-vars */
const {
  Client,

  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandSubcommandGroupBuilder,
} = require("discord.js");

const SubCommands = [require("./Deps/View"), require("./Deps/Create"), require("./Deps/Delete")];
const AutocompleteDutyType = require("../../../../Utilities/Autocompletion/DutyType");

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * @param {Client} Client
 * @param {ChatInputCommandInteraction} Interaction
 */
async function Callback(Client, Interaction) {
  //
}

// /**
//  * Autocompletion for the Roblox username required command option
//  * @param {AutocompleteInteraction} Interaction
//  * @returns {Promise<void>}
//  */
// async function Autocomplete(Interaction) {
//   const { name, value } = Interaction.options.getFocused(true);
//   const SubcommandName = Interaction.options.getSubcommand();
//   let Suggestions;

//   if (name === "name" && SubcommandName === "delete") {
//     Suggestions = await AutocompleteDutyType(value, Interaction);
//   } else {
//     Suggestions = [];
//   }

//   return Interaction.respond(Suggestions);
// }

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const SubCommandGroupObject = {
  data: new SlashCommandSubcommandGroupBuilder()
    .setName("types")
    .setDescription("Duty types related actions.")
    .addSubcommand(SubCommands[0].data)
    .addSubcommand(SubCommands[1].data)
    .addSubcommand(SubCommands[2].data),

  callback: Callback,
  // autocomplete: Autocomplete,
};

// ---------------------------------------------------------------------------------------
module.exports = SubCommandGroupObject;
