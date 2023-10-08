import Colors from "@Resources/BrickColors.js";
import ShuffleArray from "../Other/ShuffleArray.js";

/**
 * Autocompletes an input brick color name
 * @param Typed - The input string value
 * @returns An array of suggestions
 */
export default function AutocompleteColor(Typed: string): Array<{ name: string; value: string }> {
  let Suggestions: string[] = [];

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
