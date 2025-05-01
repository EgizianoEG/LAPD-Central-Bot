import {
  MessageFlags,
  SlashCommandBuilder,
  InteractionContextType,
  SlashCommandSubcommandsOnlyBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalBuilder,
  ActionRowBuilder,
  ModalSubmitInteraction,
} from "discord.js";

// ---------------------------------------------------------------------------------------

async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  const ComponentsInput = new TextInputBuilder()
    .setCustomId("components_input")
    .setLabel("Components V2 Array (JSON format)")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Enter your Components V2 array as JSON...")
    .setRequired(true)
    .setMaxLength(4000);

  const ActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(ComponentsInput);

  const Modal = new ModalBuilder()
    .setCustomId("components_v2_modal")
    .setTitle("Components V2 Message Creator")
    .addComponents(ActionRow);

  await Interaction.showModal(Modal);

  // Set up modal submit collector
  const ModalSubmit = await Interaction.awaitModalSubmit({
    filter: (i) => i.customId === "components_v2_modal" && i.user.id === Interaction.user.id,
    time: 300000, // 5 minutes timeout
  }).catch(() => null);

  if (!ModalSubmit) return;

  await HandleModalSubmit(ModalSubmit);
}

async function HandleModalSubmit(Interaction: ModalSubmitInteraction<"cached">) {
  try {
    const ComponentsText = Interaction.fields.getTextInputValue("components_input");
    const ComponentsArray = JSON.parse(ComponentsText);

    return Interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: ComponentsArray,
    });
  } catch (Err: any) {
    return Interaction.reply({
      content: `Error processing components: ${Err.message}`,
      ephemeral: true,
    });
  }
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject: SlashCommandObject<SlashCommandSubcommandsOnlyBuilder> = {
  callback: Callback,
  options: { dev_only: true },
  data: new SlashCommandBuilder()
    .setName("cv2-send-message")
    .setContexts(InteractionContextType.Guild)
    .setDescription("Creates a message with custom Components V2 array"),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
