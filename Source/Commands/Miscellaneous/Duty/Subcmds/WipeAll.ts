// Dependencies:
// -------------

import {
  ButtonStyle,
  ButtonBuilder,
  ComponentType,
  ActionRowBuilder,
  SlashCommandSubcommandBuilder,
} from "discord.js";

import { ErrorMessages } from "@Resources/AppMessages.js";
import { SendErrorReply } from "@Utilities/Other/SendReply.js";
import { IsValidShiftTypeName } from "@Utilities/Other/Validators.js";
import { InfoEmbed, WarnEmbed, SuccessEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

import HandleActionCollectorExceptions from "@Utilities/Other/HandleButtonCollectorExceptions.js";
import HandleCollectorFiltering from "@Utilities/Other/HandleCollectorFilter.js";
import ShiftActionLogger from "@Utilities/Classes/ShiftActionLogger.js";
import HumanizeDuration from "humanize-duration";
import ShiftModel from "@Models/Shift.js";

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
      Interaction,
      Ephemeral: true,
      Title: ErrorMessages.MalformedShiftTypeName.Title,
      Message: ErrorMessages.MalformedShiftTypeName.Description,
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

  const QueryMatch = { guild: Interaction.guildId, type: ShiftType ?? { $exists: true } };
  const ShiftData = await ShiftModel.aggregate([
    { $match: QueryMatch },
    { $group: { _id: null, totalTime: { $sum: "$durations.on_duty" }, count: { $sum: 1 } } },
    { $unset: ["_id"] },
  ]);

  const PromptEmbed = new WarnEmbed()
    .setFooter({
      iconURL: "https://i.ibb.co/d7mdTRY/Info-Orange-Outlined-28.png",
      text: "This prompt will automatically cancel after five minutes of inactivity.",
    })
    .setDescription(
      "**Are you certain you want to delete all recorded and active shifts for %s?**\n\n" +
        "A total number of `%i` shifts with total duration of `%s` will be deleted.\n\n" +
        "**Note:** This action is ***irreversible***, and data cannot be restored after confirmation, and you take responsibility for it.",
      ShiftType ? `\`${ShiftType}\` duty shift type` : "all duty shift types",
      ShiftData[0]?.count ?? 0,
      HumanizeDuration(ShiftData[0]?.totalTime ?? 0, { round: true, conjunction: " and " })
    );

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
    fetchReply: true,
  });

  const DisablePrompt = () => {
    PromptComponents[0].components.forEach((Button) => Button.setDisabled(true));
    return PromptMessage.edit({
      components: PromptComponents,
    }).catch((Err) => {
      if (Err.code === 50_001) return;
      throw Err;
    });
  };

  await PromptMessage.awaitMessageComponent({
    filter: (ButtonInteract) => HandleCollectorFiltering(Interaction, ButtonInteract),
    componentType: ComponentType.Button,
    time: 5 * 60_000,
  })
    .then(async (ButtonInteract) => {
      await DisablePrompt();
      if (ButtonInteract.customId.includes("confirm-wipe")) {
        const Response = (await ShiftModel.deleteMany(QueryMatch).exec()) as any;
        Response.allTime = ShiftData[0]?.allTime;

        return Promise.all([
          ShiftActionLogger.LogShiftsWipe(ButtonInteract, Response, ShiftType),
          new SuccessEmbed()
            .setDescription("Deleted **`%d`** recorded shifts successfully.", Response.deletedCount)
            .replyToInteract(ButtonInteract),
        ]);
      } else {
        return new InfoEmbed()
          .setTitle("Deletion Cancelled")
          .setDescription("Shift data deletion has been cancelled.")
          .replyToInteract(ButtonInteract);
      }
    })
    .catch((Err) => HandleActionCollectorExceptions(Err, DisablePrompt));
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
