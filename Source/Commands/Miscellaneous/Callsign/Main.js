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
/** @type SlashCommandObject */
const CommandObject = {
  data: new SlashCommandBuilder()
    .setName("callsign")
    .setDescription("Callsign database of police officers.")
    .setDMPermission(false),

  callback: Callback,
  options: {},
};

// ----------------------------
module.exports = CommandObject;
