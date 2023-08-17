const GuildModel = require("../../Models/Guild");

/**
 * Autocompletes an input weight
 * @param {String} TypedValue The input string
 * @param {String} GuildID The interaction guild Id
 * @returns {Promise<Array.<{name, value}>>} An array of suggestions
 */
async function AutocompleteDutyType(TypedValue, GuildID) {
  const GuildData = await GuildModel.findOne({ id: GuildID });
  let Suggestions;

  if (TypedValue.match(/^\s*$/)) {
    Suggestions = GuildData.settings.shift_settings.shift_types;
  } else {
    Suggestions = GuildData.settings.shift_settings.shift_types.filter((Element) => {
      return Element.startsWith(TypedValue);
    });
  }

  Suggestions = Suggestions.map((Choice) => ({
    name: Choice,
    value: Choice,
  }));

  return Suggestions;
}

// ---------------------------------
module.exports = AutocompleteDutyType;
