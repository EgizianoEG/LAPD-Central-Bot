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
  const ShiftTypes = await GuildModel.findOne(
    { id: GuildId },
    "settings.shift_settings.shift_types"
  ).then((GuildData) => {
    if (!GuildData) return [];
    return GuildData.settings.shift_settings.shift_types.map((ShiftType) => ShiftType.name);
  });

  if (!ShiftTypes.length) {
    return [];
  } else if (TypedValue.match(/^\s*$/)) {
    Suggestions = ShiftTypes;
  } else {
    Suggestions = ShiftTypes.filter((Element) => {
      return Element.startsWith(TypedValue);
    });
  }

  Suggestions = Suggestions.slice(0, 25).map((Choice) => ({
    name: Choice,
    value: Choice,
  }));

  return Suggestions;
}

// ------------------------------------
module.exports = AutocompleteShiftType;
