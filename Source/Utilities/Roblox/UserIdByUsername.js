const {
  APICache: { IdByUsername },
} = require("../General/Cache");
// --------------------------------------

/**
 * Returns the user id of the input username string
 * @param {(String|Array.<String>)} Usernames - The username to get its id from
 * @return {(Promise.<Number>)} The user id of the input username or undefined if input is invailed or the http response was corrupted
 */
async function GetIdFromUsername(Usernames) {
  Usernames = Array.isArray(Usernames) ? Usernames : [Usernames];
  const Stringified = Usernames.toString();

  if (IdByUsername.has(Stringified)) {
    return IdByUsername.get(Stringified);
  }

  return fetch("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    body: JSON.stringify({
      usernames: Usernames,
      excludeBannedUsers: false,
    }),
  })
    .then((Response) => {
      if (Response.ok) {
        return Response.json();
      } else {
        throw new Error(
          `Could not fetch user id from ${Usernames}. Exited with status text: "${Response.statusText}".`
        );
      }
    })
    .then((Json) => {
      let Results = Usernames.map((Username) => {
        return Json.data.find((UserObject) => UserObject.requestedUsername === Username);
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
