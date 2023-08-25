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
    .setName("manage")
    .setDescription("Manage and control your own duty shift.")
    .addStringOption((Option) =>
      Option.setName("type")
        .setDescription("The type of duty shift to be managed.")
        .setMinLength(3)
        .setMaxLength(20)
        .setAutocomplete(true)
        .setRequired(false)
    ),

  callback: Callback,
};

// ---------------------------------------------------------------------------------------
module.exports = CommandObject;
