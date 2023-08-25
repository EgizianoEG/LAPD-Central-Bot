const { default: Axios } = require("axios");
// -----------------------------------------

/**
 * Checks the presence of specific user(s).
 * @param {String|Number|Array<Number|String>} UserIDs - The User IDs to get presence information
 * @returns {Promise<RobloxUserPresence|RobloxUserPresence[]>} - A list of users representing search results; User presence Type ['Offline' = 0, 'Online' = 1, 'InGame' = 2, 'InStudio' = 3, 'Invisible' = 4].
 *  - - If a single User ID is provided, the promise resolves to a single UserPresence object.
 *  - - If multiple User IDs are provided, the promise resolves to an array of UserPresence objects.
 */
async function GetPresence(UserIDs) {
  if (!UserIDs || UserIDs === "0") {
    throw new Error("Invalid argument received.");
  }

  const IdsArray = Array.isArray(UserIDs) ? UserIDs : [UserIDs];
  const Payload = { userIds: IdsArray };
  const RequestURL = "https://presence.roblox.com/v1/presence/users";

  return Axios.post(RequestURL, Payload).then((Res) => {
    const Results = IdsArray.map((UserID) => {
      return Res.data.userPresences.find(
        (/** @type {RobloxUserPresence} */ UserObject) => UserObject.userId === UserID
      );
    });

    return IdsArray.length > 1 ? Results : Results[0];
  });
}

// --------------------------
module.exports = GetPresence;
