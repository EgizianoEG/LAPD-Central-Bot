const GuildModel = require("../../Models/Guild");
// ----------------------------------------------------------------

/**
 * Autocompletes an input weight
 * @param {String} TypedValue The input string
 * @param {String} GuildId The interaction guild Id
 * @returns {Promise<Array<{name: string, value: string}>>} An array of suggestions
 */
async function AutocompleteShiftType(TypedValue, GuildId) {
  let Suggestions;
  const ShiftTypes = await GuildModel.findById(GuildId, "settings.shifts.types").then(
    (GuildData) => {
      if (!GuildData) return [];
      return GuildData.settings.shifts.types
        .map((ShiftType) => ShiftType.name)
        .sort((a, b) => a.localeCompare(b));
    }
  );

  if (!ShiftTypes.length) {
    return [];
  } else if (TypedValue.match(/^\s*$/)) {
    Suggestions = ShiftTypes;
  } else {
    Suggestions = ShiftTypes.filter((Element) => {
      return Element.match(new RegExp(TypedValue, "i"));
    });
  }

  return Suggestions.slice(0, 25).map((Choice) => ({
    name: Choice,
    value: Choice,
  }));
}

// ------------------------------------
module.exports = AutocompleteShiftType;
