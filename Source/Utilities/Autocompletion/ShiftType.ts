import { EscapeRegExp } from "@Utilities/Strings/Formatters.js";
import GuildModel from "@Models/Guild.js";

const DefaultSuggestion = {
  name: "[Default Shift Type]",
  value: "Default",
};

/**
 * Autocompletes an input weight.
 * @param TypedValue The input string.
 * @param GuildId The interaction guild Id.
 * @param IncludeDefault Whether or not to include the default shift type suggestion; `true` by default.
 * @returns An array of suggestions.
 */
export default async function AutocompleteShiftType(
  TypedValue: string,
  GuildId: string,
  IncludeDefault = true
): Promise<Array<{ name: string; value: string }>> {
  let Suggestions: (string | { name: string; value: string })[];
  const EscapedValue = EscapeRegExp(TypedValue);
  const ShiftTypes = await GuildModel.findById(GuildId)
    .select("settings.shifts.types")
    .then((GuildData) => {
      if (!GuildData) return [];
      return GuildData.settings.shifts.types
        .map((ShiftType) => ShiftType.name)
        .sort((a, b) => a.localeCompare(b));
    });

  if (!ShiftTypes.length) {
    Suggestions = [];
  } else if (EscapedValue.match(/^\s*$/)) {
    Suggestions = ShiftTypes;
  } else {
    Suggestions = ShiftTypes.filter((Element) => {
      return Element.match(new RegExp(EscapedValue, "i"));
    });
  }

  if (IncludeDefault) {
    Suggestions.unshift(DefaultSuggestion);
  }

  return Suggestions.slice(0, 25).map((Choice) =>
    typeof Choice === "string" ? { name: Choice, value: Choice } : Choice
  ) as { name: string; value: string }[];
}
