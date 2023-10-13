import { EmbedBuilder, SlashCommandSubcommandBuilder } from "discord.js";
import {
  InfoEmbed,
  WarnEmbed,
  ErrorEmbed,
  SuccessEmbed,
  UnauthorizedEmbed,
} from "@Utilities/Classes/ExtraEmbeds.js";

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * @param Client
 * @param Interaction
 */
async function Callback(Client: DiscordClient, Interaction: SlashCommandInteraction) {
  const EmbedType = Interaction.options.get("type")?.value;
  let Embed: EmbedBuilder;

  switch (EmbedType) {
    case 1:
      Embed = new InfoEmbed().setDescription("This is the default information embed of this bot.");
      break;
    case 2:
      Embed = new WarnEmbed().setDescription("This is the default warning embed of this bot.");
      break;
    case 3:
      Embed = new ErrorEmbed().setDescription("This is the default error embed of this bot.");
      break;
    case 4:
      Embed = new UnauthorizedEmbed().setDescription(
        "This is the default unauthorized embed of this bot."
      );
      break;
    case 5:
      Embed = new SuccessEmbed().setDescription("This is the default success embed of this bot.");
      break;
    default:
      Embed = new ErrorEmbed().setDescription("Type option is not provided.");
  }

  await Interaction.reply({ embeds: [Embed] });
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  data: new SlashCommandSubcommandBuilder()
    .setName("embed")
    .setDescription("Outputs a specified default embed. Info, warning, and etc..")
    .addIntegerOption((Option) =>
      Option.setName("type")
        .setDescription("The type of the embed you want to output.")
        .setRequired(true)
        .setChoices(
          { name: "Information", value: 1 },
          { name: "Warning", value: 2 },
          { name: "Error", value: 3 },
          { name: "Unauthorized", value: 4 },
          { name: "Success", value: 5 }
        )
    ),

  callback: Callback,
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
