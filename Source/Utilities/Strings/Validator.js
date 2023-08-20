/**
 * Checks wether a given string can be valid as a Roblox username
 * @param {String} Str
 * @return {Boolean}
 */
function IsValidRobloxUsername(Str) {
  return !!Str.match(/^(?=^[^_\n]+_?[^_\n]+$)\w{3,20}$/);
}

/**
 * Checks wether a given string can be a valid shift type name
 * @param {String} Str
 * @return {Boolean}
 */
function IsValidShiftTypeName(Str) {
  return !!Str.match(/^[\w\-. ]{3,20}$/);
}

module.exports = {
  IsValidRobloxUsername,
  IsValidShiftTypeName,
};
