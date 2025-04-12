import { type ApplicationCommandOptionChoiceData } from "discord.js";
import GetAllCitationNums from "@Utilities/Database/GetCitationNumbers.js";

/**
 * Autocompletes an input citation number.
 * @param Typed The input value from user.
 * @param GuildId The interaction guild id.
 * @returns An array of suggestions.
 */
export default async function AutocompleteCitationNum(
  Typed: string,
  GuildId: string
): Promise<Array<ApplicationCommandOptionChoiceData>> {
  const Cits = await GetAllCitationNums(GuildId);
  let Suggestions: typeof Cits;

  if (Typed.match(/^\s*$/)) {
    Suggestions = Cits;
  } else {
    Suggestions = Cits.filter((Cit) => {
      return Cit.autocomplete_label.toLowerCase().includes(Typed.toLowerCase());
    });
  }

  if (!Suggestions.length) Suggestions = Cits;
  return Suggestions.slice(0, 25).map((Cit) => ({
    name: Cit.autocomplete_label,
    value: Cit.num,
  }));
}
