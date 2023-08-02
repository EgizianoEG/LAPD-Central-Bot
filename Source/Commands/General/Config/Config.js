// eslint-disable-next-line no-unused-vars
const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");
// -------------------------------------------------------------------------------

/**
 * @param {Client} Client
 * @param {CommandInteraction} Interaction
 */
async function Callback(Client, Interaction) {}

const CommandObject = {
  callback: Callback,
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Manage and view bot configuration on the server."),
};

// ----------------------------
module.exports = CommandObject;
