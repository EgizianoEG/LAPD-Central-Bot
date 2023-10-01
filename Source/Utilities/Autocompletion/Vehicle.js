const ERLCVehicles = require("../../Resources/ERLCVehicles");
const ShuffleArray = require("../Other/ShuffleArray");
const { FormatVehicleName } = require("../Strings/Formatter");

/** @type {Array<String>} */
const VehicleNames = [];
// ----------------------------------------------------------------

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
 * @param {String} Typed - The input string value
 * @returns {Array<{name: string, value: string}>} An array of suggestions
 */
function AutocompleteVehicle(Typed) {
  let Suggestions = [];

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

// ----------------------------------------------------------------
module.exports = AutocompleteVehicle;
