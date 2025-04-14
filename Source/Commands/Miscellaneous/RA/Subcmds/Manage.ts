import { SlashCommandSubcommandBuilder } from "discord.js";

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  // ...basic callback logic...
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  callback: Callback,
  data: new SlashCommandSubcommandBuilder()
    .setName("manage")
    .setDescription("Manage your own reduced activity notice."),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
