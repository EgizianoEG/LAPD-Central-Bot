// Dependencies:
// -------------

import {
  ButtonStyle,
  ButtonBuilder,
  ComponentType,
  ActionRowBuilder,
  SlashCommandSubcommandBuilder,
} from "discord.js";

import { SendErrorReply } from "@Utilities/Other/SendReply.js";
import { InfoEmbed, WarnEmbed, SuccessEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import { IsValidShiftTypeName } from "@Utilities/Other/Validator.js";

import ShiftModel from "@Models/Shift.js";
import HandleCollectorFiltering from "@Utilities/Other/HandleCollectorFilter.js";

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Handles validation of the `name` interaction option (Shift Type Name).
 * @param ShiftTypeName - The provided shift type name from the user
 * @param Interaction - The user command interaction
 * @returns If the interaction has been handled, returns `true`, otherwise returns `false`
 */
async function HandleNameValidation(
  Interaction: SlashCommandInteraction<"cached">,
  ShiftTypeName: string
): Promise<boolean> {
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
 * @param _
 * @param Interaction
 */
async function Callback(_: DiscordClient, Interaction: SlashCommandInteraction<"cached">) {
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
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`confirm-wipe:${Interaction.user.id}`)
        .setLabel("Confirm and Wipe")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`cancel-wipe:${Interaction.user.id}`)
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
      if (ButtonInteract.customId.includes("confirm-wipe")) {
        const Response = await ShiftModel.deleteMany({
          guild: Interaction.guildId,
          type: ShiftType ?? { $exists: true },
          end_timestamp: { $not: null },
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
export default CommandObject;
