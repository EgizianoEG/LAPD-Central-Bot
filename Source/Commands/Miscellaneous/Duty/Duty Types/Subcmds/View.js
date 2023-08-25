// - @ts-nocheck
// -------------
// Dependencies:
// ------------------------------------------------------------------------------------
const { SlashCommandSubcommandBuilder } = require("discord.js");

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Handles the command execution process for displaying all available duty shift types.
 * @param {DiscordClient} _ - The Discord.js client instance (not used in this function)
 * @param {SlashCommandInteraction} Interaction - The user command interaction
 * @description
 * @execution
 */
async function Callback(_, Interaction) {}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  data: new SlashCommandSubcommandBuilder()
    .setName("view")
    .setDescription("Lists all server-created duty types."),

  callback: Callback,
};

// ---------------------------------------------------------------------------------------
module.exports = CommandObject;
