import { type ApplicationCommandOptionChoiceData } from "discord.js";
import GetAllIncidentNums from "@Utilities/Database/GetIncidentNumbers.js";

/**
 * Autocompletes an input citation number.
 * @param Typed The input value from user.
 * @param GuildId The interaction guild id.
 * @returns An array of suggestions.
 */
export default async function AutocompleteIncidentNum(
  Typed: string,
  GuildId: string
): Promise<Array<ApplicationCommandOptionChoiceData>> {
  const Incidents = await GetAllIncidentNums(GuildId);
  let Suggestions: typeof Incidents;

  if (Typed.match(/^\s*$/)) {
    Suggestions = Incidents;
  } else {
    Suggestions = Incidents.filter((Incident) => {
      return Incident.num.includes(Typed);
    });
  }

  if (!Suggestions.length) Suggestions = Incidents;
  return Suggestions.slice(0, 25).map((Incident) => ({
    name: Incident.autocomplete_label,
    value: Incident.num,
  }));
}
