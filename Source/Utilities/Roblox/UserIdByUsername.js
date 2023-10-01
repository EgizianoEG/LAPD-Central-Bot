/* eslint-disable no-extra-parens */

const { default: Axios } = require("axios");
const {
  APICache: { IdByUsername },
} = require("../Other/Cache");
// --------------------------------------

/**
 * Returns the user id of the input username string
 * @param {(String|Array<String>)} Usernames - The username to get its id from
 * @param {(Boolean|undefined)} [ExcludeBanned=true] - Whether to exclude banned users from the response
 * @return {(Promise<[Number, String][]|[Number, String]|Null>)} The user id of the input username as the first array item or null if input is invalid, user is banned (optional), or the http response was corrupted
 */
async function GetIdFromUsername(Usernames, ExcludeBanned = true) {
  Usernames = Array.isArray(Usernames) ? Usernames : [Usernames];
  const Stringified = Usernames.toString();

  if (IdByUsername.has(Stringified)) {
    return /** @type {any} */ (IdByUsername.get(Stringified));
  }

  return await Axios.post("https://users.roblox.com/v1/usernames/users", {
    usernames: Usernames,
    excludeBannedUsers: ExcludeBanned,
  })
    .then((Res) => {
      let Results = /** @type {any} */ (Usernames)
        .map((Username) => {
          return Res.data.data.find((UserObject) => UserObject.requestedUsername === Username);
        })
        .map((UserObject) => {
          if (!UserObject?.id) return null;
          return [UserObject?.id, UserObject?.name];
        });

      Results = Usernames.length > 1 ? Results : Results[0];
      IdByUsername.set(Stringified, Results);

      return Results;
    })
    .catch((Err) => {
      console.log("GetIdFromUsername - Error Occurred: ", Err);
      return null;
    });
}

// --------------------------------
module.exports = GetIdFromUsername;
