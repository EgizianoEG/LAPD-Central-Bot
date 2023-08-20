// eslint-disable-next-line no-unused-vars
const { Client, ChatInputCommandInteraction, SlashCommandBuilder } = require("discord.js");
// -------------------------------------------------------------------------------

/**
 * @param {Client} Client
 * @param {ChatInputCommandInteraction} Interaction
 */
async function Callback(Client, Interaction) {}

const CommandObject = {
  callback: Callback,
  data: new SlashCommandBuilder()
    .setName("callsign")
    .setDescription("Callsign database of police officers."),
};

// ----------------------------
module.exports = CommandObject;
