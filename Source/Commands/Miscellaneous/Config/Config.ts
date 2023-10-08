import { SlashCommandBuilder } from "discord.js";
// ---------------------------------------------------------------------------------------

/**
 * @param Client
 * @param Interaction
 */
async function Callback(Client: DiscordClient, Interaction: SlashCommandInteraction) {}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
/** @type {SlashCommandObject} */
const CommandObject: SlashCommandObject = {
  options: {},
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Manage and view bot configuration on the server.")
    .setDMPermission(false),

  callback: Callback,
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
