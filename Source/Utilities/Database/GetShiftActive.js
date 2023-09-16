const ShiftModel = require("../../Models/Shift");
// ----------------------------------------------------------------

/**
 * Retrieves and returns the active shifts (with the input ShiftType or with all by default)
 * for a certain guild using the interaction data in the provided object and, if specified
 * (UserOnly option), the current active shift for the person who initiated the interaction.
 * @defaults All active shifts for the guild in which the interaction was initiated, including all shift types.
 * @type {Utilities.Database.ShiftActiveFunc}
 * @example
 * const ShiftActive = require("../ShiftActive");
 * const CmdInteraction = ...
 * 
 * const IsShiftActive = ShiftActive({ Interaction: CmdInteraction, ShiftType: ["Default", "Night"] }).then((Shifts) => {
    Shifts.forEach(async (Shift) => {
      console.log("Shift Started:", Shift.start_timestamp);
      console.log("Shift Type:", Shift.type);
      console.log("Ending...");
      await Shift.end();
    });
  });
 */
async function ShiftActive({ Interaction, ShiftType, UserOnly = false }) {
  const ActiveShifts = await ShiftModel.find({
    guild: Interaction.guildId,
    user: UserOnly ? Interaction.user.id : { $exists: true },
    type: ShiftType ?? { $exists: true },
    end_timestamp: null,
  }).exec();

  // @ts-ignore - typings bugs
  return UserOnly ? ActiveShifts[0] ?? null : ActiveShifts;
}

// ----------------------------------------------------------------
module.exports = ShiftActive;
