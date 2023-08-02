/**
 * Checks the presence of specific user(s).
 * @param {(String|Number|Array.<Number>)} UserIDs - The User IDs to get presence information
 * @returns {Promise.<(UserPresence|UserPresence[])>} - A list of users representing search results; User presence Type ['Offline' = 0, 'Online' = 1, 'InGame' = 2, 'InStudio' = 3, 'Invisible' = 4].
 *  - - If a single User ID is provided, the promise resolves to a single UserPresence object.
 *  - - If multiple User IDs are provided, the promise resolves to an array of UserPresence objects.
 */
async function GetPresence(UserIDs) {
  if (!UserIDs || UserIDs === "0") {
    throw new Error("Invalid argument received.");
  }

  UserIDs = Array.isArray(UserIDs) ? UserIDs : [UserIDs];
  const Payload = { userIds: UserIDs };
  const RequestURL = "https://presence.roblox.com/v1/presence/users";

  return fetch(RequestURL, { method: "POST", body: JSON.stringify(Payload) })
    .then(async (Response) => {
      if (!Response.ok) throw new Error(Response.statusText);
      return Response.json();
    })
    .then((Json) => {
      const Results = UserIDs.map((UserID) => {
        return Json.userPresences.find((UserObject) => UserObject.userId === UserID);
      });

      return UserIDs.length > 1 ? Results : Results[0];
    })
    .catch((Error) => {
      console.log(`GetPresence - Could not fetch presense. Error: ${Error}.`);
      return null;
    });
}

// --------------------------
module.exports = GetPresence;
// ----------------------------------------------------------------
/**
 * @typedef {Object} UserPresence
 * @property {(0|1|2|3|4)} userPresenceType - The user presence type. Possible values: 0 = Offline, 1 = Online, 2 = InGame, 3 = InStudio, 4 = Invisible.
 * @property {(string|"")} lastLocation - The user's last location.
 * @property {(number|null)} placeId - The ID of the current place.
 * @property {(number|null)} rootPlaceId - The ID of the root place.
 * @property {(string|null)} gameId - The ID of the game. (Format: UUID)
 * @property {(number|null)} universeId - The ID of the universe.
 * @property {number} userId - The ID of the user.
 * @property {string} lastOnline - The timestamp indicating the last online time. (Format: Date-Time)
 */
