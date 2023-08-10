const { default: Axios } = require("axios");
const {
  APICache: { IdByUsername },
} = require("../General/Cache");
// --------------------------------------

/**
 * Returns the user id of the input username string
 * @param {(String|Array.<String>)} Usernames - The username to get its id from
 * @param {(Boolean|undefined)} [ExcludeBanned=true] - Whether to exclude banned users from the response
 * @return {(Promise.<(Number|Null)>)} The user id of the input username or null if input is invailed, user is banned (optional), or the http response was corrupted
 */
async function GetIdFromUsername(Usernames, ExcludeBanned = true) {
  Usernames = Array.isArray(Usernames) ? Usernames : [Usernames];
  const Stringified = Usernames.toString();

  if (IdByUsername.has(Stringified)) {
    return IdByUsername.get(Stringified);
  }

  return await Axios.post("https://users.roblox.com/v1/usernames/users", {
    usernames: Usernames,
    excludeBannedUsers: ExcludeBanned,
  })
    .then((Res) => {
      let Results = Usernames.map((Username) => {
        return Res.data.data.find((UserObject) => UserObject.requestedUsername === Username);
      }).map((UserObject) => {
        return UserObject?.id || null;
      });

      Results = Usernames.length > 1 ? Results : Results[0];
      IdByUsername.set(Stringified, Results);

      return Results;
    })
    .catch((Error) => {
      console.log("GetIdFromUsername - Error Occurred: ", Error);
      return null;
    });
}

// --------------------------------
module.exports = GetIdFromUsername;
