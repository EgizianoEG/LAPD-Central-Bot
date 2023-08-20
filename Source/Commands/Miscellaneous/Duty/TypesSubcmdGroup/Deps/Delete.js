/* eslint-disable no-unused-vars */
const {
  Client,
  ChatInputCommandInteraction,
  SlashCommandSubcommandBuilder,
} = require("discord.js");

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * @param {Client} Client
 * @param {ChatInputCommandInteraction} Interaction
 */
async function Callback(Client, Interaction) {}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  data: new SlashCommandSubcommandBuilder()
    .setName("delete")
    .setDescription("Delete and remove a specific duty shift type.")
    .addStringOption((Option) =>
      Option.setName("name")
        .setDescription("The type to be deleted.")
        .setMinLength(3)
        .setMaxLength(20)
        .setAutocomplete(true)
        .setRequired(true)
    ),

  callback: Callback,
};

// ---------------------------------------------------------------------------------------
module.exports = CommandObject;
