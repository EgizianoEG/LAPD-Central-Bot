import ERLCVehicles from "@Resources/ERLCVehicles.js";
import ShuffleArray from "../Other/ShuffleArray.js";
import { FormatVehicleName } from "../Strings/Formatter.js";

const VehicleNames: string[] = [];
for (const Brand of ERLCVehicles) {
  for (const Model of Brand.models) {
    VehicleNames.push(
      FormatVehicleName(Model, {
        name: Brand.brand,
        alias: Brand.counterpart,
      })
    );
  }
}

/**
 * Autocompletes an input vehicle model
 * @param Typed - The input string value
 * @returns An array of suggestions
 */
export default function AutocompleteVehicle(Typed: string): Array<{ name: string; value: string }> {
  let Suggestions: string[] = [];

  if (Typed.match(/^\s*$/)) {
    Suggestions = ShuffleArray(VehicleNames);
  } else {
    Suggestions = VehicleNames.filter((Name) => {
      return Name.toLowerCase().includes(Typed.toLowerCase());
    });
  }

  if (!Suggestions.length) Suggestions = ShuffleArray(VehicleNames);
  return Suggestions.slice(0, 25).map((Choice) => ({ name: Choice, value: Choice }));
}
