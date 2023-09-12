const { default: Axios } = require("axios");
const { IsValidRobloxUsername } = require("../Other/Validator");
const {
  APICache: { UsernameSearches },
} = require("../Other/Cache");
// --------------------------------------
/**
 * Searches for a user by their username and returns the search results
 * @param {String} Username - The username to query and search for its user
 * @returns {Promise<Utilities.Roblox.UserSearchResult[]>} A list of users representing search results
 */
async function QueryUsername(Username) {
  if (!IsValidRobloxUsername(Username)) return [];
  if (UsernameSearches.has(Username)) {
    return UsernameSearches.get(Username) ?? [];
  }

  const RequestURL = `https://www.roblox.com/search/users/results?keyword=${Username}&maxRows=25`;
  return Axios.get(RequestURL)
    .then(({ data }) => {
      if (data.UserSearchResults) {
        UsernameSearches.set(Username, data.UserSearchResults);
        return data.UserSearchResults;
      } else {
        return [];
      }
    })
    .catch((Err) => {
      console.log("QueryUsername - Could not query requested username;", Err);
      return [];
    });
}

// ----------------------------
module.exports = QueryUsername;
