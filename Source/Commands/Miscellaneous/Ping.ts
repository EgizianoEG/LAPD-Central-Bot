// Dependencies:
// -------------
import Humanizer from "humanize-duration";
import { SuccessEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import { SlashCommandBuilder } from "discord.js";
// ---------------------------------------------------------------------------------------

/**
 * @param Client
 * @param Interaction
 */
async function Callback(Client: DiscordClient, Interaction: SlashCommandInteraction) {
  await Interaction.deferReply({ ephemeral: true });

  const Reply = await Interaction.fetchReply();
  const ClientPing = Reply.createdTimestamp - Interaction.createdTimestamp;
  const AppUptime = Humanizer(Client.uptime, {
    conjunction: " and ",
    largest: 3,
    round: true,
  });

  const Response = new SuccessEmbed()
    .setTimestamp()
    .setFooter({
      text: "Application Developed by @egiziano",
    })
    .setDescription(
      "Client Ping: `%s`ms\nWebsocket: `%s`ms\nApplication Uptime: `%s`",
      ClientPing,
      Client.ws.ping >= 0 ? Client.ws.ping : 0,
      AppUptime
    );

  return Interaction.editReply({ embeds: [Response] });
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject: SlashCommandObject = {
  callback: Callback,
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription(
      "Provides the current latency (ping) for both the client and websocket, as well as the bot's uptime."
    ),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
