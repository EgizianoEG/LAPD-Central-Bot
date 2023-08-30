/* eslint-disable */
const {
  Client,
  Colors,
  EmbedBuilder,
  ChatInputCommandInteraction,
  ApplicationCommandOptionType,
  SlashCommandSubcommandBuilder,
} = require("discord.js");
/* eslint-enable */

const {
  Embeds: { Thumbs },
  Images,
  Icons,
} = require("../../../../Config/Shared.js");

// ---------------------------------------------------------------------------------------
/**
 * @param {Client} Client
 * @param {ChatInputCommandInteraction} Interaction
 */
async function Callback(Client, Interaction) {
  const ART_Embed = new EmbedBuilder()
    .setTitle("Arrest Report Template")
    .setDescription(`Arrest Report Template Requested by <@${Interaction.user.id}>`)
    .setTimestamp(new Date())
    .setColor(Colors.DarkBlue)
    .setThumbnail(Thumbs.AvatarMale)
    .setImage(Images.LAPD_Header)
    .setFooter({
      text: "Report signed by: Unknown (@Unknown)",
      iconURL: Icons.Signature,
    })
    .setFields([
      {
        name: "Defendant Name",
        value: "Someone (@someone)",
        inline: true,
      },
      {
        name: "Gender",
        value: "Male",
        inline: true,
      },
      {
        name: "Arrest Age",
        value: "Mid Adult (30-49)",
        inline: true,
      },
      {
        name: "Height",
        value: "5'8\"",
        inline: true,
      },
      {
        name: "Weight",
        value: "179 lbs",
        inline: true,
      },
      {
        name: "Charges",
        value:
          "1. Eluding a Peace Officer: Disregarding Safety\n - Statute: 2800.2(A) VC\n2. Open Warrant: Issued by CHP",
        inline: false,
      },
      {
        name: "Sentence Duration",
        value: "Open",
        inline: true,
      },
      {
        name: "Restitution Amount",
        value: "$5,000.00",
        inline: true,
      },
    ]);

  await Interaction.reply({ embeds: [ART_Embed], ephemeral: true });
}

const CommandObject = {
  data: new SlashCommandSubcommandBuilder()
    .setName("arrest-report-temp")
    .setDescription("Outputs a default arrest report with filled data."),

  callback: Callback,
};

// ---------------------------------------------------------------------------------------
module.exports = CommandObject;
