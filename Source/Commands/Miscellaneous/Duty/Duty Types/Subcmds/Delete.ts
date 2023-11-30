// Dependencies:
// -------------

import {
  Colors,
  Message,
  ButtonStyle,
  EmbedBuilder,
  ButtonBuilder,
  ComponentType,
  ActionRowBuilder,
  InteractionResponse,
  SlashCommandSubcommandBuilder,
} from "discord.js";

import { ErrorMessages } from "@Resources/AppMessages.js";
import { SendErrorReply } from "@Utilities/Other/SendReply.js";
import { IsValidShiftTypeName } from "@Utilities/Other/Validator.js";
import { InfoEmbed, SuccessEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

import Util from "node:util";
import Dedent from "dedent";
import GetShiftTypes from "@Utilities/Database/GetShiftTypes.js";
import DeleteShiftType from "@Utilities/Database/DeleteShiftType.js";
import HandleCollectorFiltering from "@Utilities/Other/HandleCollectorFilter.js";

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Handles validation of the `name` interaction option (Shift Type Name).
 * @param Interaction - The user command interaction
 * @param ShiftTypeName - The provided name from the user
 * @returns The interaction reply (an error reply) if validation failed; otherwise `undefined`
 */
async function HandleNameValidation(
  Interaction: SlashCommandInteraction<"cached">,
  ShiftTypeName: string
): Promise<Message<boolean> | InteractionResponse<boolean> | undefined> {
  if (!IsValidShiftTypeName(ShiftTypeName)) {
    return SendErrorReply({
      Interaction,
      Ephemeral: true,
      Title: ErrorMessages.MalformedShiftTypeName.Title,
      Message: ErrorMessages.MalformedShiftTypeName.Description,
    });
  } else if (ShiftTypeName.match(/Default/i)) {
    return SendErrorReply({
      Interaction,
      Ephemeral: true,
      Title: ErrorMessages.PreservedShiftTypeDeletion.Title,
      Message: ErrorMessages.PreservedShiftTypeDeletion.Description,
    });
  } else {
    const ShiftTypeExists = await GetShiftTypes(Interaction.guildId).then((ShiftTypes) => {
      for (const ShiftType of ShiftTypes) {
        if (ShiftType.name === ShiftTypeName) return true;
      }
      return false;
    });
    if (!ShiftTypeExists)
      return SendErrorReply({
        Interaction,
        Ephemeral: true,
        Title: ErrorMessages.NonexistentShiftTypeDeletion.Title,
        Message: Util.format(ErrorMessages.NonexistentShiftTypeDeletion.Description, ShiftTypeName),
      });
  }
}

/**
 * Handles the command execution process for deleting a duty shift type.
 * @param _ - The Discord.js client instance (not used in this function)
 * @param Interaction - The user command interaction
 * @description
 * Handles the entire process of deleting a duty shift type. Validates the provided shift type name,
 * displays a confirmation prompt, waits for user interaction, and performs the deletion or cancellation.
 *
 * @execution
 * 1. Retrieve the provided shift type name from the interaction options.
 * 2. Validate the shift type name using the HandleNameValidation function.
 * 3. If validation fails or interaction is already replied, return early.
 * 4. Build and send the deletion confirmation prompt embed with components.
 * 5. Await user interaction (button click) with a timeout of 5 minutes.
 * 6. If timed out, cancel the deletion and reply with a cancellation message.
 * 7. If user clicks "Confirm and Delete," execute the deletion process.
 * 8. If deletion fails, send an error reply with the error details.
 * 9. If deletion is successful, reply with a success message.
 * 10. If user clicks "Cancel Deletion," reply with a cancellation message.
 */
async function Callback(_: DiscordClient, Interaction: SlashCommandInteraction<"cached">) {
  const ShiftTypeName = Interaction.options.getString("name", true);

  await HandleNameValidation(Interaction, ShiftTypeName);
  if (Interaction.replied) return;

  const PromptEmbed = new EmbedBuilder()
    .setColor(Colors.Orange)
    .setTitle("Shift Type Deletion")
    .setDescription(
      Dedent(`
        **Are you sure you want to delete the shift type named \`${ShiftTypeName}\`?**
        **Note:** Deleting a shift type does not erase the logged shift data associated with it, and those records can still be recovered by re-creating it using the same name.
        \u200b
        *This prompt will automatically cancel after five minutes of inactivity.*
      `)
    );

  const PromptComponents = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`confirm-deletion:${Interaction.user.id}`)
        .setLabel("Confirm and Delete")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`cancel-deletion:${Interaction.user.id}`)
        .setLabel("Cancel Deletion")
        .setStyle(ButtonStyle.Secondary)
    ) as ActionRowBuilder<ButtonBuilder>,
  ];

  const PromptMessage = await Interaction.reply({
    embeds: [PromptEmbed],
    components: PromptComponents,
  });

  const DisablePrompt = () => {
    PromptComponents[0].components.forEach((Button) => Button.setDisabled(true));
    return PromptMessage.edit({
      components: PromptComponents,
    });
  };

  const HandleCollectorExceptions = async (Err: Error) => {
    if (Err.message.match(/reason: time/)) {
      await DisablePrompt();
    } else if (Err.message.match(/reason: \w+Delete/)) {
      /* Ignore message/channel/guild deletion */
    } else {
      throw Err;
    }
  };

  await PromptMessage.awaitMessageComponent({
    filter: (ButtonInteract) => HandleCollectorFiltering(Interaction, ButtonInteract),
    componentType: ComponentType.Button,
    time: 5 * 60_000,
  })
    .then(async (ButtonInteract) => {
      await DisablePrompt();
      if (ButtonInteract.customId.includes("confirm-deletion")) {
        const Response = await DeleteShiftType(ShiftTypeName, Interaction.guildId);

        if (Response instanceof Error) {
          return SendErrorReply({
            Interaction: ButtonInteract,
            Title: Response.title,
            Message: Response.message,
          });
        } else {
          return ButtonInteract.reply({
            embeds: [
              new SuccessEmbed().setDescription(
                "Successfully deleted `%s` shift type.",
                ShiftTypeName
              ),
            ],
          });
        }
      } else {
        return ButtonInteract.reply({
          embeds: [
            new InfoEmbed()
              .setTitle("Deletion Cancelled")
              .setDescription(
                "Deletion cancelled for the `%s` shift type due to user request.",
                ShiftTypeName
              ),
          ],
        });
      }
    })
    .catch(HandleCollectorExceptions);
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  data: new SlashCommandSubcommandBuilder()
    .setName("delete")
    .setDescription("Delete and remove a specific duty shift type.")
    .addStringOption((Option) =>
      Option.setName("name")
        .setDescription("The shift type to be deleted.")
        .setMinLength(3)
        .setMaxLength(20)
        .setAutocomplete(true)
        .setRequired(true)
    ),

  callback: Callback,
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
