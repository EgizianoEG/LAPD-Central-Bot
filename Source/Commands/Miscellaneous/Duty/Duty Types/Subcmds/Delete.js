// -------------
// Dependencies:
// ------------------------------------------------------------------------------------

const {
  Colors,
  ButtonStyle,
  EmbedBuilder,
  ButtonBuilder,
  ComponentType,
  ActionRowBuilder,
  SlashCommandSubcommandBuilder,
} = require("discord.js");

const { InfoEmbed, SuccessEmbed } = require("../../../../../Utilities/Classes/ExtraEmbeds");
const { IsValidShiftTypeName } = require("../../../../../Utilities/Other/Validator");
const { SendErrorReply } = require("../../../../../Utilities/Other/SendReply");

const GetShiftTypes = require("../../../../../Utilities/Database/GetShiftTypes");
const DeleteShiftType = require("../../../../../Utilities/Database/DeleteShiftType");
const HandleCollectorFiltering = require("../../../../../Utilities/Other/HandleCollectorFilter");
const Dedent = require("dedent").default;

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Handles validation of the `name` interaction option (Shift Type Name).
 * @param {SlashCommandInteraction<"cached">} Interaction - The user command interaction
 * @param {String} ShiftTypeName - The provided name from the user
 * @returns {Promise<(DiscordJS.Message<boolean>) | (DiscordJS.InteractionResponse<boolean>) | undefined>} The interaction reply (an error reply) if validation failed; otherwise `undefined`
 */
async function HandleNameValidation(Interaction, ShiftTypeName) {
  if (!IsValidShiftTypeName(ShiftTypeName)) {
    return SendErrorReply({
      Ephemeral: true,
      Interaction,
      Title: "Malformed Shift Type Name",
      Message:
        "The name of a shift type may only consist of letters, numerals, spaces, underscores, dashes, and periods.",
    });
  } else if (ShiftTypeName.match(/Default/i)) {
    return SendErrorReply({
      Ephemeral: true,
      Interaction,
      Title: "Preserved Shift Type",
      Message: "Cannot delete the preserved shift type `Default`.",
    });
  } else {
    const Exists = await GetShiftTypes(Interaction.guildId).then((ShiftTypes) => {
      for (const ShiftType of ShiftTypes) {
        if (ShiftType.name === ShiftTypeName) return true;
      }
      return false;
    });
    if (!Exists)
      return SendErrorReply({
        Ephemeral: true,
        Interaction,
        Title: "Shift Type Not Found",
        Message: `The shift type \`${ShiftTypeName}\` does not exist in the server and cannot be deleted.`,
      });
  }
}

/**
 * Handles the command execution process for deleting a duty shift type.
 * @param {DiscordClient} _ - The Discord.js client instance (not used in this function)
 * @param {SlashCommandInteraction<"cached">} Interaction - The user command interaction
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
async function Callback(_, Interaction) {
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
    /** @type {ActionRowBuilder<ButtonBuilder>} */
    (new ActionRowBuilder()).addComponents(
      new ButtonBuilder()
        .setCustomId(`confirm-deletion:${Interaction.user.id}`)
        .setLabel("Confirm and Delete")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`cancel-deletion:${Interaction.user.id}`)
        .setLabel("Cancel Deletion")
        .setStyle(ButtonStyle.Secondary)
    ),
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

  /** @param {Error} Err */
  const HandleCollectorExceptions = async (Err) => {
    if (Err.message.match(/reason: time/)) {
      await DisablePrompt();
    } else if (Err.message.match(/reason: \w+Delete/)) {
      /* ignore message/channel/guild deletion */
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
module.exports = CommandObject;
