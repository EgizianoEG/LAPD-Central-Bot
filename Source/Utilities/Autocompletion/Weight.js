const WeightOptions = [];
const Cache = {};

for (let i = 25; i <= 700; i++) {
  WeightOptions.push(i.toString());
}

Cache.Default = WeightOptions.filter((Element) => {
  return Element.match(/^1\d0$/);
}).map((Choice) => ({ name: `${Choice} lbs`, value: Choice }));

/**
 * Autocompletes an input weight
 * @param {String} TypedValue The input weight
 * @returns {Array<{name: string, value: string}>} - An array of weight suggestions
 */
function AutocompleteWeight(TypedValue) {
  let Suggestions;

  if (TypedValue in Cache) return Cache[TypedValue];
  if (TypedValue.match(/^\D*$/)) {
    return Cache.Default;
  } else if (TypedValue.length === 1) {
    Suggestions = WeightOptions.filter((Element) => {
      return Element.match(new RegExp(`^${TypedValue}\\d0$`));
    });
  } else {
    Suggestions = WeightOptions.filter((Element) => {
      return Element.startsWith(TypedValue);
    });
  }

  Suggestions = Suggestions.map((Choice) => ({ name: `${Choice} lbs`, value: Choice }));
  Cache[TypedValue] = Suggestions;

  return Suggestions;
}

// ---------------------------------
module.exports = AutocompleteWeight;
