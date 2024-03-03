import type { ApplicationCommandOptionChoiceData } from "discord.js";
import GetAllBookingNums from "@Utilities/Database/GetBookingNums.js";

/**
 * Autocompletes an input citation number.
 * @param Typed The input value from user.
 * @param GuildId The interaction guild id.
 * @returns An array of suggestions.
 */
export default async function AutocompleteBookingNum(
  Typed: string,
  GuildId: string
): Promise<Array<ApplicationCommandOptionChoiceData>> {
  const Bookings = await GetAllBookingNums(GuildId);
  let Suggestions: typeof Bookings;

  if (Typed.match(/^\s*$/)) {
    Suggestions = Bookings;
  } else {
    Suggestions = Bookings.filter((Bk) => {
      return Bk.num.includes(Typed);
    });
  }

  if (!Suggestions.length) Suggestions = Bookings;
  return Suggestions.map((Bk) => ({
    name: Bk.autocomplete_label,
    value: Bk.num,
  })).slice(0, 25);
}
