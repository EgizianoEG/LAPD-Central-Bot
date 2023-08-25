const QueryUsername = require("../Roblox/QueryUsername");
// ------------------------------------------------------

/**
 * Autocompletes an input Roblox username
 * @param {String} Username The username to query and search for its user
 * @returns {Promise<Array<{name: string, value: string}>>} An array of suggestions
 */
async function AutocompleteUsername(Username) {
  return (await QueryUsername(Username)).map((Result) => {
    return { name: Result.Name, value: Result.Name };
  });
}

module.exports = AutocompleteUsername;
