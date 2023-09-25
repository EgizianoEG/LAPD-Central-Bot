const {
  ButtonStyle,
  ButtonBuilder,
  ComponentType,
  ActionRowBuilder,
  SlashCommandSubcommandBuilder,
} = require("discord.js");

const { SendErrorReply } = require("../../../../Utilities/Other/SendReply");
const { IsValidShiftTypeName } = require("../../../../Utilities/Other/Validator");
const { InfoEmbed, WarnEmbed, SuccessEmbed } = require("../../../../Utilities/Classes/ExtraEmbeds");

const ShiftModel = require("../../../../Models/Shift");
const HandleCollectorFiltering = require("../../../../Utilities/Other/HandleCollectorFilter");

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Handles validation of the `name` interaction option (Shift Type Name).
 * @param {String} ShiftTypeName - The provided shift type name from the user
 * @param {SlashCommandInteraction<"cached">} Interaction - The user command interaction
 * @returns {Promise<Boolean>} If the interaction has been handled, returns `true`, otherwise returns `false`
 */
async function HandleNameValidation(Interaction, ShiftTypeName) {
  if (!IsValidShiftTypeName(ShiftTypeName)) {
    await SendErrorReply({
      Ephemeral: true,
      Interaction,
      Title: "Malformed Shift Type Name",
      Message:
        "The name of a shift type may only consist of letters, numerals, spaces, underscores, dashes, and periods.",
    });
    return true;
  }
  return false;
}

/**
 * @param {DiscordClient} _
 * @param {SlashCommandInteraction<"cached">} Interaction
 */
async function Callback(_, Interaction) {
  const ShiftType = Interaction.options.getString("type");
  if (ShiftType && (await HandleNameValidation(Interaction, ShiftType))) return;

  const PromptEmbed = new WarnEmbed()
    .setDescription(
      "**Are you certain you want to delete all recorded shifts for %s?**\n",
      ShiftType ? `\`${ShiftType}\` duty shift type` : "all duty shift types",
      "**Note:** This action is ***irreversible***, and data cannot be restored after confirmation, and you take responsibility for it.\n\n"
    )
    .setFooter({
      text: "This prompt will automatically cancel after five minutes of inactivity.",
    });

  const PromptComponents = [
    /** @type {ActionRowBuilder<ButtonBuilder>} */
    (new ActionRowBuilder()).addComponents(
      new ButtonBuilder()
        .setCustomId(`confirm-wipe:${Interaction.user.id}`)
        .setLabel("Confirm and Wipe")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`cancel-wipe:${Interaction.user.id}`)
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
      if (ButtonInteract.customId.includes("confirm-wipe")) {
        const Response = await ShiftModel.deleteMany({
          guild: Interaction.guildId,
          type: ShiftType ?? { $exists: true },
          end_timestamp: null,
        }).exec();

        return new SuccessEmbed()
          .setDescription("Deleted **`%d`** recorded shifts successfully.", Response.deletedCount)
          .replyToInteract(ButtonInteract);
      } else {
        return new InfoEmbed()
          .setTitle("Deletion Cancelled")
          .setDescription("Shift data deletion has been cancelled.")
          .replyToInteract(ButtonInteract);
      }
    })
    .catch(HandleCollectorExceptions);
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  data: new SlashCommandSubcommandBuilder()
    .setName("wipe-all")
    .setDescription("Erases all shift durations for all recognized personnel.")
    .addStringOption((Option) =>
      Option.setName("type")
        .setDescription("The type of duty shifts to be erased.")
        .setMinLength(3)
        .setMaxLength(20)
        .setRequired(false)
        .setAutocomplete(true)
    ),

  callback: Callback,
};

// ---------------------------------------------------------------------------------------
module.exports = CommandObject;
