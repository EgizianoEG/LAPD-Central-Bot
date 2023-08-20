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
    .setName("wipe-all")
    .setDescription("Erases all shift durations for all recognized personnel.")
    .addStringOption((Option) =>
      Option.setName("type")
        .setDescription("The type of duty shifts to be erased.")
        .setMinLength(3)
        .setMaxLength(20)
        .setAutocomplete(true)
        .setRequired(false)
    ),

  callback: Callback,
};

// ---------------------------------------------------------------------------------------
module.exports = CommandObject;
