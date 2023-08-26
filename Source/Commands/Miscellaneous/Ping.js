// Dependencies:
const Humanizer = require("humanize-duration");
const { SuccessEmbed } = require("../../Utilities/Classes/ExtraEmbeds");
const { SlashCommandBuilder } = require("discord.js");
// ---------------------------------------------------------------------------------------

/**
 * @param {DiscordClient} Client
 * @param {SlashCommandInteraction} Interaction
 */
async function Callback(Client, Interaction) {
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
const CommandObject = {
  callback: Callback,
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription(
      "Provides the current latency (ping) for both the client and websocket, as well as the bot's uptime."
    ),
};

// ----------------------------
module.exports = CommandObject;
