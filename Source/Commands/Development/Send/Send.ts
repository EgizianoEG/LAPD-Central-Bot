import { SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from "discord.js";
const SubCommands = [(await import("./Deps/Embed.js")).default];

// ---------------------------------------------------------------------------------------
/**
 * @param Client
 * @param Interaction
 */
async function Callback(Client: DiscordClient, Interaction: SlashCommandInteraction) {
  for (const SubCommand of SubCommands) {
    if (SubCommand.data.name === Interaction.options.getSubcommand()) {
      if (typeof SubCommand.callback === "function") {
        return SubCommand.callback(Client, Interaction);
      } else {
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject: SlashCommandObject<SlashCommandSubcommandsOnlyBuilder> = {
  callback: Callback,
  options: { dev_only: true },
  data: new SlashCommandBuilder()
    .setName("send")
    .setDescription("Sends a specific information.")
    .addSubcommand(SubCommands[0].data),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
