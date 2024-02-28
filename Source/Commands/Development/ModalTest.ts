import { RandomString } from "@Utilities/Strings/Random.js";
import {
  Colors,
  EmbedBuilder,
  ModalBuilder,
  ActionRowBuilder,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import AppError from "@Utilities/Classes/AppError.js";
import Dedent from "dedent";

// ---------------------------------------------------------------------------------------
async function Callback(Interaction: SlashCommandInteraction) {
  const AdditionalDataModal = new ModalBuilder()
    .setTitle("Test Modal")
    .setCustomId(`modal-${RandomString(4)}:${Interaction.user.id}:${Interaction.guildId}`)
    .setComponents(
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setLabel("Paragraph Text Box")
          .setStyle(TextInputStyle.Paragraph)
          .setCustomId("pt")
          .setPlaceholder("1.\n2.\n3.")
          .setMinLength(6)
          .setMaxLength(1000)
      ),
      new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
          .setLabel("Short Text")
          .setStyle(TextInputStyle.Short)
          .setCustomId("st")
          .setPlaceholder("any to type")
          .setMinLength(6)
          .setMaxLength(128)
          .setRequired(false)
      )
    );

  const ModalFilter = (MS) => {
    return MS.user.id === Interaction.user.id && MS.customId === AdditionalDataModal.data.custom_id;
  };

  try {
    await Interaction.showModal(AdditionalDataModal);
    await Interaction.awaitModalSubmit({ time: 5 * 60_000, filter: ModalFilter }).then(
      async (Submission) => {
        const Field1 = Submission.fields.getTextInputValue("pt");
        const Field2 = Submission.fields.getTextInputValue("st");

        const ReplyEmbed = new EmbedBuilder()
          .setColor(Colors.Grey)
          .setTitle("Test Modal Inputs")
          .setDescription(
            Dedent(`
            **Field 1:**
            \`\`\`fix
            ${Field1}
            \`\`\`
            **Field 2:**
            \`\`\`fix
            ${Field2}
            \`\`\`
          `)
          );

        Submission.reply({ embeds: [ReplyEmbed], ephemeral: true });
      }
    );
  } catch (Err: any) {
    if (Err instanceof Error && !Err.message.match(/reason: (?:\w+Delete|time)/)) {
      throw new AppError({ message: Err.message, stack: Err.stack });
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
    .setName("modal-test")
    .setDMPermission(true)
    .setDescription("Shows a modal for testing."),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
