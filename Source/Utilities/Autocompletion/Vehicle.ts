import { AllVehicleModels, ERLCVehiclesData } from "@Resources/ERLCVehicles.js";
import { FormatVehicleName } from "../Strings/Formatters.js";
import ShuffleArray from "../Other/ShuffleArray.js";

const VehicleProps: string[] = [];
const VehicleNames: string[] = [];

for (const Brand of ERLCVehiclesData) {
  for (const Model of Brand.models) {
    if (!VehicleProps.includes(Model.style.toLowerCase())) {
      VehicleProps.push(Model.style.toLowerCase());
    }

    if (!VehicleProps.includes(Model.class.toLowerCase())) {
      VehicleProps.push(Model.class.toLowerCase());
    }

    if (!VehicleProps.includes(Model.category.toLowerCase())) {
      VehicleProps.push(Model.category.toLowerCase());
    }

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
  const LowerCased = Typed.toLowerCase();

  if (Typed.match(/^\s*$/)) {
    Suggestions = ShuffleArray(VehicleNames);
  } else if (VehicleProps.includes(LowerCased)) {
    const MatchingModels = AllVehicleModels.filter(
      (Model) =>
        Model.style.toLowerCase() === LowerCased ||
        Model.class.toLowerCase() === LowerCased ||
        Model.category.toLowerCase() === LowerCased
    );

    Suggestions = MatchingModels.map((Model) =>
      FormatVehicleName(Model, { name: Model.brand, alias: Model.counterpart })
    );
  } else {
    Suggestions = VehicleNames.filter((Name) => {
      return Name.toLowerCase().includes(LowerCased);
    });
  }

  if (!Suggestions.length) Suggestions = ShuffleArray(VehicleNames);
  return Suggestions.slice(0, 25).map((Choice) => ({ name: Choice, value: Choice }));
}
