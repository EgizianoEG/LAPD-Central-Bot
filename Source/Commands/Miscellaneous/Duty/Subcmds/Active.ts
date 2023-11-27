import { SlashCommandSubcommandBuilder } from "discord.js";
import { ExtraTypings } from "@Typings/Utilities/Database.js";
import { InfoEmbed } from "@Utilities/Classes/ExtraEmbeds.js";

import DurationHumanizer from "humanize-duration";
import GetActiveShifts from "@Utilities/Database/GetShiftActive.js";

const ReadableDuration = DurationHumanizer.humanizer({
  conjunction: " and ",
  largest: 4,
  round: true,
});

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Returns a formatted informative embed displaying the active shifts
 * @param ActiveGroupedShifts
 * @returns
 */
async function FormatActiveShifts(
  ActiveGroupedShifts: Record<string, Array<ExtraTypings.HydratedShiftDocument>>
): Promise<InfoEmbed> {
  const Fields: Array<{ value: string; name: string; inline?: boolean }> = [];
  let IncludesAnnotations = false;

  for (const [ShiftType, ActiveShifts] of Object.entries(ActiveGroupedShifts)) {
    const FieldLines: string[] = [];
    for (const Shift of ActiveShifts) {
      FieldLines.push(
        `1. <@${Shift.user}> \u{1680} ${ReadableDuration(Shift.durations.total)} ${
          Shift.events.breaks.some((Epochs) => {
            if (Epochs[1] === null) {
              IncludesAnnotations = true;
              return true;
            }
            return false;
          })
            ? "***⁽¹⁾***"
            : ""
        }`
      );
    }
    Fields.push({ name: ShiftType, value: FieldLines.join("\n") });
  }

  return new InfoEmbed()
    .setTitle("⏱️ Currently Active Shifts")
    .setDescription("**The server's current active shifts, categorized by type**")
    .setFooter(IncludesAnnotations ? { text: "[1]: Currently on break" } : null)
    .setFields(Fields)
    .setThumbnail(null)
    .setTimestamp();
}

/**
 * @param _
 * @param Interaction
 */
async function Callback(_: DiscordClient, Interaction: SlashCommandInteraction<"cached">) {
  const ActiveShifts = await GetActiveShifts({ Interaction });

  const GAShifts = Object.groupBy(ActiveShifts, ({ type }) => type);
  const ASOrdered = Object.entries(GAShifts)
    .sort((a, b) => b[1].length - a[1].length)
    .reduce((obj, [key, value]) => {
      obj[key] = value.toSorted(
        (a, b) => a.start_timestamp.valueOf() - b.start_timestamp.valueOf()
      );
      return obj;
    }, {});

  if (ActiveShifts.length) {
    return (await FormatActiveShifts(ASOrdered)).replyToInteract(Interaction);
  } else {
    return new InfoEmbed()
      .setTitle("No Active Shifts")
      .setDescription("There are no active shifts at this moment.")
      .replyToInteract(Interaction);
  }
}

// ---------------------------------------------------------------------------------------
// Command structure:
// ------------------
const CommandObject = {
  data: new SlashCommandSubcommandBuilder()
    .setName("active")
    .setDescription("Displays all members whose shifts are presently active."),

  callback: Callback,
};

// ---------------------------------------------------------------------------------------
export default CommandObject;
