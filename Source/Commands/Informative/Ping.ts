import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { SuccessEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
// ---------------------------------------------------------------------------------------

/**
 * @param Client
 * @param Interaction
 */
async function Callback(Client: DiscordClient, Interaction: SlashCommandInteraction) {
  await Interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const Reply = await Interaction.fetchReply();
  const ClientPing = Reply.createdTimestamp - Interaction.createdTimestamp;

  const ResponseEmbed = new SuccessEmbed()
    .setTimestamp(Reply.createdTimestamp)
    .setDescription(
      "RT Latency: `%i`ms\n" + "Websocket: `%i`ms\n",
      ClientPing,
      Client.ws.ping >= 0 ? Client.ws.ping : 0
    );

  return Interaction.editReply({ embeds: [ResponseEmbed] });
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject: SlashCommandObject = {
  callback: Callback,
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Provides the current latency (ping) for both the bot and websocket."),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
