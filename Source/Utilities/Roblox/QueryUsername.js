const { IsValidRobloxUsername } = require("../Strings/Validator");
const {
  APICache: { UsernameSearches },
} = require("../General/Cache");
// --------------------------------------
/**
 * Searches for a user by their username and returns the search results
 * @param {String} Username - The username to query and search for its user
 * @returns {Promise.<Array.<UserSearchResult>>} - A list of users representing search results
 */
async function QueryUsername(Username) {
  if (!IsValidRobloxUsername(Username)) return [];
  if (UsernameSearches.has(Username)) {
    return UsernameSearches.get(Username);
  }

  const RequestURL = `https://www.roblox.com/search/users/results?keyword=${Username}&maxRows=25`;
  return fetch(RequestURL)
    .then(async (Response) => {
      if (!Response.ok) throw new Error(Response.statusText);
      return Response.json();
    })
    .then((Json) => {
      if (Json.UserSearchResults) {
        UsernameSearches.set(Username, Json.UserSearchResults);
        return Json.UserSearchResults;
      } else {
        return [];
      }
    })
    .catch((Error) => {
      console.log(`QueryUsername - Could not query requested username. Error: ${Error.message}.`);
      return [];
    });
}

// ----------------------------
module.exports = QueryUsername;
// ----------------------------------------------------------------

/**
 * @typedef UserSearchResult
 * @property {Number} UserId - The id of the user
 * @property {String} Name - The username of the user
 * @property {String} DisplayName - The display name of the user
 * @property {String} Blurb -
 * @property {String} PreviousUserNamesCsv -
 * @property {Boolean} IsOnline -
 * @property {String?} LastLocation -
 * @property {String} UserProfilePageUrl -
 * @property {String?} LastSeenDate -
 * @property {String} PrimaryGroup -
 * @property {String} PrimaryGroupUrl -
 * @property {Boolean} HasVerifiedBadge -
 */
