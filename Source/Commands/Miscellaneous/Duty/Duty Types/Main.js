/* eslint-disable no-unused-vars */
const { SlashCommandSubcommandGroupBuilder } = require("discord.js");

const Subcommands = [
  require("./Subcmds/View"),
  require("./Subcmds/Create"),
  require("./Subcmds/Delete"),
];

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * @param {DiscordClient} Client
 * @param {SlashCommandInteraction<"cached">} Interaction
 */
function Callback(Client, Interaction) {
  const SubcommandName = Interaction.options.getSubcommand();
  for (const Subcommand of Subcommands) {
    if (Subcommand.data.name === SubcommandName) {
      if (typeof Subcommand.callback === "function") {
        return Subcommand.callback(Client, Interaction);
      } else {
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const SubcommandGroupObject = {
  data: new SlashCommandSubcommandGroupBuilder()
    .setName("types")
    .setDescription("Duty shift type and its related actions."),

  callback: Callback,
};

for (const Subcommand of Subcommands) {
  SubcommandGroupObject.data.addSubcommand(Subcommand.data);
}

// ---------------------------------------------------------------------------------------
module.exports = SubcommandGroupObject;
