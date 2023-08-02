const QueryUsername = require("../Roblox/QueryUsername");
// ------------------------------------------------------
/**
 * @typedef Suggestion
 * @property {String} name - The client viewable name of the suggestion
 * @property {String} value - The value of the suggestion
 */

/**
 * Autocompletes an input Roblox username
 * @param {String} Username The username to query and search for its user
 * @returns {Promise.<Array.<Suggestion>>} An array of suggestions each item represents a suggestion
 */
async function AutocompleteUsername(Username) {
  return (await QueryUsername(Username)).map((Result) => {
    return { name: Result.Name, value: Result.Name };
  });
}

module.exports = AutocompleteUsername;
