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
    .setName("active")
    .setDescription("Displays all members whose shifts are presently active."),

  callback: Callback,
};

// ---------------------------------------------------------------------------------------
module.exports = CommandObject;
