const { default: Axios } = require("axios");

/**
 * Returns the profile details
 * @param {*} UserId
 * @returns {Promise<UserProfileDetails>} User profile details
 */
async function GetPlayerInfo(UserId) {
  return await Axios.get(`https://users.roblox.com/v1/users/${UserId}`).then((Res) => Res.data);
}

module.exports = GetPlayerInfo;

/**
 * Represents a user profile.
 * @typedef {Object} UserProfileDetails
 * @property {string} description - The about/description of the user.
 * @property {string} created - The timestamp when the user profile was created (RFC 3339).
 * @property {boolean} isBanned - Indicates whether the user is banned or not.
 * @property {?string} externalAppDisplayName - The display name in an external app, if available.
 * @property {boolean} hasVerifiedBadge - Indicates if the user has a verified badge.
 * @property {number} id - The unique identifier for the user.
 * @property {string} name - The username of the user.
 * @property {string} displayName - The display name of the user.
 */
