const { SlashCommandBuilder } = require("discord.js");
// -------------------------------------------------------------------------------

/**
 * @param {DiscordClient} Client
 * @param {SlashCommandInteraction} Interaction
 */
async function Callback(Client, Interaction) {}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
/** @type {SlashCommandObject} */
const CommandObject = {
  options: {},
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Manage and view bot configuration on the server.")
    .setDMPermission(false),

  callback: Callback,
};

// ----------------------------
module.exports = CommandObject;
