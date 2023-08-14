/**
 * Checks wether a given string can be valid as a Roblox username
 * @param {String} Str
 * @return {Boolean} Indication whether the provided string can be a valid Roblox username
 */
function IsValidRobloxUsername(Str) {
  return Str.match(/^(?=^[^_\n]+_?[^_\n]+$)\w{3,20}$/) ?? false;
}

module.exports = {
  IsValidRobloxUsername,
};
