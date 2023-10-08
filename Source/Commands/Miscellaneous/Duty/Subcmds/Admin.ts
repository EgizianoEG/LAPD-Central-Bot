import { SlashCommandSubcommandBuilder } from "discord.js";

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * @param Client
 * @param Interaction
 */
async function Callback(Client: DiscordClient, Interaction: SlashCommandInteraction) {}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  data: new SlashCommandSubcommandBuilder()
    .setName("admin")
    .setDescription("Manage and administer the duty shift of somebody else.")
    .addUserOption((Option) =>
      Option.setName("member")
        .setDescription("The member to manage their duty shift.")
        .setRequired(true)
    )
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
export default CommandObject;
