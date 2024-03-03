import type { ApplicationCommandOptionChoiceData } from "discord.js";
import { TenCodes, ElevenCodes, LiteralCodes } from "@Resources/RadioCodes.js";

const AllCodes = [...LiteralCodes, ...TenCodes, ...ElevenCodes];
const CodeNames: string[] = [];
for (const Code of AllCodes) {
  CodeNames.push(`${Code.code} (${Code.title})`);
}

/**
 * Autocompletes an input radio code.
 * @param Typed - The typed string.
 * @returns An array of objects containing name and value properties.
 */
export default function AutocompleteRadioCode(
  Typed: string
): Array<ApplicationCommandOptionChoiceData> {
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
