import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { Embeds } from "@Config/Shared.js";

async function Callback(_: DiscordClient, Interaction: SlashCommandInteraction) {
  const ResponseEmbed = new EmbedBuilder()
    .setColor(Embeds.Colors.Info)
    .setTitle("Help and Information")
    .setDescription(
      "For more information and assistance with LAPD Central, please visit our [documentation site](https://lapd-central-app.gitbook.io/documentation)."
    );

  return Interaction.reply({
    embeds: [ResponseEmbed],
    flags: MessageFlags.Ephemeral,
  });
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject: SlashCommandObject = {
  callback: Callback,
  data: new SlashCommandBuilder().setName("help").setDescription("Learn more about LAPD Central."),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
