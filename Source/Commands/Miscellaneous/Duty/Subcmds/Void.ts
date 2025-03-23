import { ErrorEmbed, InfoEmbed, SuccessEmbed, WarnEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import {
  ButtonStyle,
  MessageFlags,
  ComponentType,
  ButtonBuilder,
  ActionRowBuilder,
  SlashCommandSubcommandBuilder,
} from "discord.js";

import Dedent from "dedent";
import GetActiveShifts from "@Utilities/Database/GetShiftActive.js";
import ShiftActionLogger from "@Utilities/Classes/ShiftActionLogger.js";
import HandleCollectorFiltering from "@Utilities/Other/HandleCollectorFilter.js";
import HandleActionCollectorExceptions from "@Utilities/Other/HandleCompCollectorExceptions.js";

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * @param Interaction
 */
async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  const ActiveShift = await GetActiveShifts({ Interaction, UserOnly: true });
  if (!ActiveShift) {
    return new ErrorEmbed()
      .useErrTemplate("ShiftMustBeActive")
      .replyToInteract(Interaction, true, false);
  }

  const PromptDesc = Dedent(`
    **Are you sure you want to void the currently active shift of type \`${ActiveShift.type}\`?**
    **Note:** This action will permanently delete this shift from the shift records.
  `);

  const PromptEmbed = new WarnEmbed()
    .setTitle("Shift Void Confirmation")
    .setFooter({ text: "This prompt will automatically cancel after five minutes of inactivity." })
    .setDescription(PromptDesc);

  const PromptButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`confirm-void:${Interaction.user.id}`)
      .setLabel("Confirm and Void")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`cancel-void:${Interaction.user.id}`)
      .setLabel("Cancel Shift Void")
      .setStyle(ButtonStyle.Secondary)
  );

  const PromptMessage = await Interaction.reply({
    embeds: [PromptEmbed],
    components: [PromptButtons],
    fetchReply: true,
    flags: MessageFlags.Ephemeral,
  });

  const DisablePrompt = () => {
    PromptButtons.components.forEach((Button) => Button.setDisabled(true));
    return Interaction.editReply({
      components: [PromptButtons],
    });
  };

  await PromptMessage.awaitMessageComponent({
    filter: (ButtonInteract) => HandleCollectorFiltering(Interaction, ButtonInteract),
    componentType: ComponentType.Button,
    time: 5 * 60 * 1000,
  })
    .then(async (ButtonInteract) => {
      await ButtonInteract.deferUpdate();
      const ActiveShiftLatestVer = await GetActiveShifts({ Interaction, UserOnly: true });
      if (!ActiveShiftLatestVer) {
        return new ErrorEmbed()
          .useErrTemplate("ShiftMustBeActive")
          .replyToInteract(ButtonInteract, true);
      } else if (ActiveShift._id !== ActiveShiftLatestVer._id) {
        return new ErrorEmbed()
          .useErrTemplate("ShiftVoidMismatch")
          .replyToInteract(ButtonInteract, true);
      }

      if (ButtonInteract.customId.includes("confirm-void")) {
        const DelResponse = await ActiveShiftLatestVer.deleteOne().exec();
        if (!DelResponse.acknowledged) {
          return new ErrorEmbed()
            .useErrTemplate("FailedToVoidShift")
            .replyToInteract(ButtonInteract, true);
        }

        return Promise.all([
          ShiftActionLogger.LogShiftVoid(ActiveShiftLatestVer, ButtonInteract),
          ButtonInteract.editReply({
            components: [],
            embeds: [
              new SuccessEmbed().setDescription(
                "Successfully voided and deleted the current active shift."
              ),
            ],
          }),
        ]);
      } else {
        return ButtonInteract.editReply({
          components: [],
          embeds: [
            new InfoEmbed()
              .setTitle("Shift Void Cancelled")
              .setDescription(
                "Voiding the currently active shift has been cancelled and no changes have been made."
              ),
          ],
        });
      }
    })
    .catch((Err) => HandleActionCollectorExceptions(Err, DisablePrompt));
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  callback: Callback,
  data: new SlashCommandSubcommandBuilder()
    .setName("void")
    .setDescription("Voids a currently active shift, removing it from shift records."),
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
