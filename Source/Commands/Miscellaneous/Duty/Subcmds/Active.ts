import { APIEmbedField, SlashCommandSubcommandBuilder } from "discord.js";
import { ExtraTypings } from "@Typings/Utilities/Database.js";
import { compareAsc } from "date-fns";
import { InfoEmbed } from "@Utilities/Classes/ExtraEmbeds.js";
import { Emojis } from "@Config/Shared.js";

import DHumanizer from "humanize-duration";
import GetActiveShifts from "@Utilities/Database/GetShiftActive.js";

const ReadableDuration = DHumanizer.humanizer({
  conjunction: " and ",
  largest: 4,
  round: true,
});

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Returns a tuple containing a list of shifts and a boolean indicating whether any shifts is considered on break.
 * @param ActiveShifts
 * @returns
 */
function ListShifts(ActiveShifts: Array<ExtraTypings.HydratedShiftDocument>) {
  let ShouldHaveBreakAnnotation = false;
  const Listed: string[] = [];

  for (const Shift of ActiveShifts) {
    const BAnnotaion = Shift.isBreakActive() ? "***⁽ᶦ⁾***" : "";
    const TOnDutyDuration = Shift.durations.on_duty;
    const Line = `1. <@${Shift.user}> \u{1680} ${ReadableDuration(TOnDutyDuration)} ${BAnnotaion}`;
    ShouldHaveBreakAnnotation = ShouldHaveBreakAnnotation || BAnnotaion.length > 0;
    Listed.push(Line);
  }

  return [Listed, ShouldHaveBreakAnnotation] as const;
}

/**
 * Returns a formatted informative embed displaying the active shifts
 * @param ActiveGroupedShifts
 * @returns
 */
function FormatActiveShifts(
  ActiveGroupedShifts: Record<string, Array<ExtraTypings.HydratedShiftDocument>>,
  SelectedShiftType: Nullable<string>
): InfoEmbed {
  const Fields: Array<APIEmbedField> = [];
  let IncludeAnnotationComment = false;

  if (SelectedShiftType) {
    const [ListedShifts, AnnotationsIncluded] = ListShifts(ActiveGroupedShifts[SelectedShiftType]);
    if (AnnotationsIncluded) IncludeAnnotationComment = true;
    Fields.push({ name: SelectedShiftType, value: ListedShifts.join("\n") });
  } else {
    for (const [ShiftType, ActiveShifts] of Object.entries(ActiveGroupedShifts)) {
      const [ListedShifts, AnnotationsIncluded] = ListShifts(ActiveShifts);
      if (AnnotationsIncluded) IncludeAnnotationComment = true;
      Fields.push({
        name: `${ShiftType} - ${ActiveShifts.length}`,
        value: ListedShifts.join("\n"),
      });
    }
  }

  const ReplyEmbed = new InfoEmbed()
    .setTitle(`${Emojis.StopWatch}   Currently Active Shifts`)
    .setDescription("**The server's current active shifts, categorized by type.**")
    .setFooter(IncludeAnnotationComment ? { text: "[𝒊]: Currently on break" } : null)
    .setFields(Fields)
    .setThumbnail(null);

  if (SelectedShiftType) {
    ReplyEmbed.setDescription(
      `**The server's current active shifts of type \`${SelectedShiftType}\`.**`
    ).setFields({
      name: `Shifts - ${ActiveGroupedShifts[SelectedShiftType].length}`,
      value: Fields[0].value,
    });
  }

  return ReplyEmbed;
}

async function Callback(Interaction: SlashCommandInteraction<"cached">) {
  const SelShiftType = Interaction.options.getString("type", false);
  const ActiveShifts = await GetActiveShifts({ Interaction, ShiftType: SelShiftType });
  const GAShifts = Object.groupBy(ActiveShifts, ({ type }) => type);
  const ASOrdered = Object.entries(GAShifts as unknown as UnPartial<typeof GAShifts>)
    .sort((a, b) => b[1].length - a[1].length)
    .reduce((obj, [key, value]) => {
      obj[key] = value.toSorted((a, b) => {
        return compareAsc(a.start_timestamp, b.start_timestamp);
      });
      return obj;
    }, {});

  if (ActiveShifts.length) {
    await FormatActiveShifts(ASOrdered, SelShiftType).replyToInteract(Interaction);
  } else {
    const RespEmbedDesc = SelShiftType
      ? "There are no active shifts at this moment for the specified shift type."
      : "There are no active shifts at this moment.";

    return new InfoEmbed()
      .setTitle("No Active Shifts")
      .setDescription(RespEmbedDesc)
      .replyToInteract(Interaction, true);
  }
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  data: new SlashCommandSubcommandBuilder()
    .setName("active")
    .setDescription(
      "Displays all personnel whose shifts are presently active, including their current duration on-duty."
    )
    .addStringOption((Option) =>
      Option.setName("type")
        .setDescription("The type of duty shift to be managed.")
        .setMinLength(3)
        .setMaxLength(20)
        .setRequired(false)
        .setAutocomplete(true)
    ),

  callback: Callback,
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
