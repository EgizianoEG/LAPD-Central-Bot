import { TenCodes, ElevenCodes, LiteralCodes } from "@Resources/RadioCodes.js";

const AllCodes = [...LiteralCodes, ...TenCodes, ...ElevenCodes];
const CodeNames: string[] = [];
for (const Code of AllCodes) {
  CodeNames.push(`${Code.code} (${Code.title})`);
}

/**
 * Autocompletes an input vehicle model
 * @param Typed - The input string value
 * @returns An array of suggestions
 */
export default function AutocompleteRadioCode(
  Typed: string
): Array<{ name: string; value: string }> {
  let Suggestions: string[] = [];

  if (Typed.match(/^\s*$/)) {
    Suggestions = CodeNames;
  } else {
    Suggestions = CodeNames.filter((Name) => {
      return Name.toLowerCase().includes(Typed.toLowerCase());
    });
  }

  if (!Suggestions.length) Suggestions = CodeNames;
  return Suggestions.slice(0, 25).map((Choice) => ({ name: Choice, value: Choice }));
}
