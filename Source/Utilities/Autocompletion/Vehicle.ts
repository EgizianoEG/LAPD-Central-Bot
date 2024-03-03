import { type ApplicationCommandOptionChoiceData } from "discord.js";
import { AllVehicleModels, ERLCVehiclesData } from "@Resources/ERLCVehicles.js";
import { FormatVehicleName } from "../Strings/Formatters.js";
import ShuffleArray from "../Other/ShuffleArray.js";

const VehicleTags: string[] = [];
const VehicleNames: string[] = [];

for (const Brand of ERLCVehiclesData) {
  for (const Model of Brand.models) {
    if (!VehicleTags.includes(Model.style.toLowerCase())) {
      VehicleTags.push(Model.style.toLowerCase());
    }

    if (!VehicleTags.includes(Model.class.toLowerCase())) {
      VehicleTags.push(Model.class.toLowerCase());
    }

    if (!VehicleTags.includes(Model.category.toLowerCase())) {
      VehicleTags.push(Model.category.toLowerCase());
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
 * Autocompletes a vehicle based on the typed input.
 * @param Typed - The typed input to autocomplete.
 * @returns
 */
export default function AutocompleteVehicle(
  Typed: string
): Array<ApplicationCommandOptionChoiceData> {
  let Suggestions: string[] = [];
  const LowerCased = Typed.toLowerCase();

  if (Typed.match(/^\s*$/)) {
    Suggestions = ShuffleArray(VehicleNames);
  } else if (VehicleTags.includes(LowerCased)) {
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
