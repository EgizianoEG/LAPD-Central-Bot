// Dependencies:
// -------------

import {
  time,
  ButtonStyle,
  ButtonBuilder,
  ComponentType,
  ActionRowBuilder,
  SlashCommandSubcommandBuilder,
} from "discord.js";

import { isAfter } from "date-fns";
import { IsValidShiftTypeName } from "@Utilities/Other/Validators.js";
import { InfoEmbed, WarnEmbed, SuccessEmbed, ErrorEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

import HandleActionCollectorExceptions from "@Utilities/Other/HandleCompCollectorExceptions.js";
import HandleCollectorFiltering from "@Utilities/Other/HandleCollectorFilter.js";
import ShiftActionLogger from "@Utilities/Classes/ShiftActionLogger.js";
import HumanizeDuration from "humanize-duration";
import ShiftModel from "@Models/Shift.js";
import * as Chrono from "chrono-node";

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Handles validation of the `name` interaction option (Shift Type Name).
 * @param ShiftTypeName - The provided shift type name from the user
 * @param Interaction - The user command interaction
 * @returns If the interaction has been handled, returns `true`, otherwise returns `false`
 */
async function HandleSTNameValidation(
  CmdInteraction: SlashCommandInteraction<"cached">,
  ShiftTypeName: string
): Promise<boolean> {
  if (!IsValidShiftTypeName(ShiftTypeName)) {
    return new ErrorEmbed()
      .useErrTemplate("MalformedShiftTypeName")
      .replyToInteract(CmdInteraction, true)
      .then(() => true);
  }
  return false;
}

async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  const ShiftType = Interaction.options.getString("type");
  const DateSpecified = Interaction.options.getString("before");
  const DateSpecifiedParsed = DateSpecified
    ? Chrono.parseDate(DateSpecified, Interaction.createdAt)
    : null;

  if (ShiftType && (await HandleSTNameValidation(Interaction, ShiftType))) return;
  if (DateSpecified && !DateSpecifiedParsed) {
    return new ErrorEmbed()
      .useErrTemplate("UnknownDateFormat")
      .replyToInteract(Interaction, true, false);
  } else if (
    DateSpecified &&
    DateSpecifiedParsed &&
    isAfter(DateSpecifiedParsed, Interaction.createdAt)
  ) {
    return new ErrorEmbed()
      .useErrTemplate("DateInFuture")
      .replyToInteract(Interaction, true, false);
  }

  const QueryMatch = {
    guild: Interaction.guildId,
    type: ShiftType ?? { $exists: true },
    end_timestamp: DateSpecifiedParsed ? { $lt: DateSpecifiedParsed } : { $ne: null },
  };

  const ShiftData = await ShiftModel.aggregate([
    { $match: QueryMatch },
    { $group: { _id: null, totalTime: { $sum: "$durations.on_duty" }, count: { $sum: 1 } } },
    { $unset: ["_id"] },
  ]);

  if (!ShiftData[0]?.count) {
    return new ErrorEmbed()
      .useErrTemplate("WipeAllNoShiftsFound")
      .replyToInteract(Interaction, true, false);
  }

  const HRBeforeDate = DateSpecifiedParsed ? `${time(DateSpecifiedParsed, "D")}, ` : "";
  const PromptEmbed = new WarnEmbed()
    .setTitle("Confirmation Required")
    .setFooter({
      iconURL: "https://i.ibb.co/d7mdTRY/Info-Orange-Outlined-28.png",
      text: "This prompt will automatically cancel after five minutes of inactivity.",
    })
    .setDescription(
      "**Are you certain you want to delete all shifts recorded before %sfor %s?**\n\n" +
        "This will permanently erase `%i` shifts totalling `%s`.\n\n" +
        "**Note:** This action is ***irreversible***, and data cannot be restored after confirmation. By confirming, you accept full responsibility for this action.",
      HRBeforeDate,
      ShiftType ? `\`${ShiftType}\` duty shift type` : "all duty shift types",
      ShiftData[0]?.count ?? 0,
      HumanizeDuration(ShiftData[0]?.totalTime ?? 0, { round: true, conjunction: " and " })
    );

  const PromptComponents = [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
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

        if (!ShiftData[0]?.count) {
          return new InfoEmbed()
            .setTitle("No Shifts Deleted")
            .setDescription("Shifts wipe wasn't necessary. There were no shifts to be deleted.")
            .replyToInteract(Interaction, true, false);
        }

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
    )
    .addStringOption((Option) =>
      Option.setName("before")
        .setDescription(
          "A date or time expression to only erase shifts that were recorded before it."
        )
        .setMinLength(4)
        .setMaxLength(40)
        .setRequired(false)
    ),

  callback: Callback,
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
