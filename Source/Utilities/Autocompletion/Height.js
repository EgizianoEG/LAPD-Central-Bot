const HeightOptions = [];
const Cache = {};

for (let i = 0; i <= 7; i++) {
  for (let j = 0; j <= 11; j++) {
    const Height = `${i}'${j}"`;
    HeightOptions.push(Height);
  }
}

/**
 * Autocompletes an input height value
 * @param {String} TypedValue - The input height
 * @returns {Array<{name: string, value: string}>} - An array of height suggestions
 */
function AutocompleteHeight(TypedValue) {
  let Suggestions;
  if (TypedValue in Cache) {
    return Cache[TypedValue];
  }

  if (TypedValue.match(/^\s*$/)) {
    Suggestions = HeightOptions.filter((Element) => {
      return Element.startsWith("5");
    });
  } else if (TypedValue.match(/^(10|11)"?$/)) {
    Suggestions = HeightOptions.filter((Element) => {
      return Element.endsWith(`${TypedValue}"`);
    });
  } else if (TypedValue.match(/^\d"$/)) {
    Suggestions = HeightOptions.filter((Element) => {
      return Element.endsWith(TypedValue);
    });
  } else {
    Suggestions = HeightOptions.filter((Element) => {
      return Element.startsWith(TypedValue);
    });
  }

  Suggestions = Suggestions.map((Choice) => ({ name: Choice, value: Choice }));
  Cache[TypedValue] = Suggestions;

  return Suggestions;
}

// ---------------------------------
module.exports = AutocompleteHeight;
