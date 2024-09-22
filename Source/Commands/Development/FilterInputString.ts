import { FilterUserInput } from "@Utilities/Strings/Redactor.js";
import Dedent from "dedent";
import {
  SlashCommandSubcommandsOnlyBuilder,
  InteractionContextType,
  SlashCommandBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  ModalBuilder,
  codeBlock,
  Colors,
} from "discord.js";

// ---------------------------------------------------------------------------------------
/**
 * @param Client
 * @param Interaction
 */
async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  const InputModal = new ModalBuilder()
    .setCustomId(`filter-input:${Interaction.user.id}:${Interaction.createdTimestamp}`)
    .setTitle("Filter Input")
    .setComponents(
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setCustomId("input")
          .setLabel("Input String")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      )
    );

  await Interaction.showModal(InputModal);
  const ModalSubmission = await Interaction.awaitModalSubmit({
    filter: (MS) => MS.customId === InputModal.data.custom_id,
    time: 10 * 60 * 1000,
  }).catch(() => null);

  if (!ModalSubmission) return;
  await ModalSubmission.deferReply({ ephemeral: true });

  const InputString = ModalSubmission.fields.getTextInputValue("input");
  const FilteredString = await FilterUserInput(InputString, {
    guild_instance: Interaction.guild,
    filter_links_emails: true,
    replacement: "#",
  });

  const ResponseMessage = new EmbedBuilder().setColor(Colors.DarkAqua).setDescription(
    Dedent(`
      ### Original input:
      ${codeBlock(InputString)}
      ### Filtered input:
      ${codeBlock(FilteredString)}  
    `)
  );

  return ModalSubmission.editReply({ embeds: [ResponseMessage] });
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject: SlashCommandObject<SlashCommandSubcommandsOnlyBuilder> = {
  callback: Callback,
  options: { dev_only: true },
  data: new SlashCommandBuilder()
    .setName("filter-input")
    .setContexts(InteractionContextType.Guild)
    .setDescription("Filters an input string."),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
