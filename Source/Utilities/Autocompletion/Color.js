const Colors = require("../../Resources/BrickColors");
const ShuffleArray = require("../Other/ShuffleArray");
// ----------------------------------------------------------------

/**
 * Autocompletes an input brick color name
 * @param {String} Typed - The input string value
 * @returns {Array<{name: string, value: string}>} An array of suggestions
 */
function AutocompleteColor(Typed) {
  /** @type {string[]} */
  let Suggestions = [];

  if (Typed.match(/^\s*$/)) {
    Suggestions = ShuffleArray(Colors).map(({ name }) => name);
  } else {
    Suggestions = Colors.filter(({ name }) => {
      return name.toLowerCase().includes(Typed.toLowerCase());
    }).map(({ name }) => name);
  }

  if (!Suggestions.length) Suggestions = ShuffleArray(Colors).map(({ name }) => name);
  return Suggestions.slice(0, 25).map((Choice) => ({ name: Choice, value: Choice }));
}

// ----------------------------------------------------------------
module.exports = AutocompleteColor;
