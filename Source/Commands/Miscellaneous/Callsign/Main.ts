const { SlashCommandBuilder } = require("discord.js");
// ---------------------------------------------------------------------------------------

/**
 * @param Client
 * @param Interaction
 */
async function Callback(Client: DiscordClient, Interaction: SlashCommandInteraction) {}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject: SlashCommandObject = {
  options: {},
  data: new SlashCommandBuilder()
    .setName("callsign")
    .setDescription("Callsign database of police officers.")
    .setDMPermission(false),

  callback: Callback,
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
