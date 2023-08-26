const { default: Axios } = require("axios");
// ----------------------------------------------------------------

/**
 * Returns the profile details
 * @param {(Number|String)} UserId
 * @returns {Promise<Utilities.Roblox.UserProfileDetails>} User profile details
 */
async function GetPlayerInfo(UserId) {
  const Res = await Axios.get(`https://users.roblox.com/v1/users/${UserId}`);
  return Res.data;
}

// ----------------------------------------------------------------
module.exports = GetPlayerInfo;
