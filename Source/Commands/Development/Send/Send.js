// eslint-disable-next-line no-unused-vars
const { Client, ChatInputCommandInteraction, SlashCommandBuilder } = require("discord.js");
const { InfoEmbed } = require("../../../Utilities/General/ExtraEmbeds");
const SubCommands = [require("./Deps/Embed"), require("./Deps/ArrestReport")];

// ---------------------------------------------------------------------------------------
/**
 * @param {Client} Client
 * @param {ChatInputCommandInteraction} Interaction
 */
async function Callback(Client, Interaction) {
  for (const SubCommand of SubCommands) {
    if (SubCommand.data.name === Interaction.options.getSubcommand()) {
      if (typeof SubCommand.callback === "function") {
        return SubCommand.callback(Client, Interaction);
      } else {
        break;
      }
    }
  }

  const InformationEmbed = new InfoEmbed("This command is currently under development.");
  Interaction.reply({ embeds: [InformationEmbed] });
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  // deleted: true,
  devOnly: true,
  callback: Callback,
  data: new SlashCommandBuilder()
    .setName("send")
    .setDescription("Sends a specific information.")
    .addSubcommand(SubCommands[0].data)
    .addSubcommand(SubCommands[1].data),
};

// ---------------------------------------------------------------------------------------
module.exports = CommandObject;
