/* eslint-disable no-unused-vars */
// Dependencies:
const Humanizer = require("humanize-duration");
const { SuccessEmbed } = require("../../Utilities/General/ExtraEmbeds");
const { SlashCommandBuilder, Client, ChatInputCommandInteraction } = require("discord.js");
// ---------------------------------------------------------------------------------------

/**
 * @param {Client} Client
 * @param {ChatInputCommandInteraction} Interaction
 * @returns {Promise<InteractionResponse<boolean>>}
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
    .setDescription(
      `Client Ping: \`${ClientPing} ms\`\nWebsocket: \`${
        Client.ws.ping >= 0 ? Client.ws.ping : 0
      } ms\`\nApplication Uptime: \`${AppUptime}\``
    )
    .setFooter({
      text: "Developed by @egiziano",
    })
    .setTimestamp();

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
