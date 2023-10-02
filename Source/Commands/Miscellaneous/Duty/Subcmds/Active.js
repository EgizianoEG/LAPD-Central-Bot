const { SlashCommandSubcommandBuilder } = require("discord.js");
const { InfoEmbed } = require("../../../../Utilities/Classes/ExtraEmbeds.js");

const groupBy = require("lodash/groupBy");
const GetActiveShifts = require("../../../../Utilities/Database/GetShiftActive");

const DurationHumanize = require("humanize-duration").humanizer({
  conjunction: " and ",
  largest: 4,
  round: true,
});

// ---------------------------------------------------------------------------------------
// Functions:
// ----------
/**
 * Returns a formatted informative embed displaying the active shifts
 * @param {Record<String, Array<Utilities.Database.HydratedShiftDocument>>} ActiveGroupedShifts
 * @returns {Promise<InfoEmbed>}
 */
async function FormatActiveShifts(ActiveGroupedShifts) {
  /** @type {Array<{ value: string, name: string, inline?: boolean }>} */
  const Fields = [];
  let IncludesAnnotations = false;

  for (const [ShiftType, ActiveShifts] of Object.entries(ActiveGroupedShifts)) {
    const FieldLines = [];
    for (const Shift of ActiveShifts) {
      FieldLines.push(
        `1. <@${Shift.user}> \u{1680} ${DurationHumanize(Shift.durations.total)} ${
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
 * @param {DiscordClient} _
 * @param {SlashCommandInteraction<"cached">} Interaction
 */
async function Callback(_, Interaction) {
  const ActiveShifts = await GetActiveShifts({ Interaction });

  const GAShifts = groupBy(ActiveShifts, (Shift) => Shift.type);
  const ASOrdered = Object.entries(GAShifts)
    .sort((a, b) => b[1].length - a[1].length)
    .reduce((obj, [key, value]) => {
      obj[key] = [...value].sort(
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
module.exports = CommandObject;
