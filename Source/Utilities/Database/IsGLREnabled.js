const GuildModel = require("../../Models/Guild.js");

/**
 * Checks if a given guild has login restrictions enabled for its users
 * @param {String} GuildId
 * @returns {Promise<Boolean>} true if the guild has login restrictions; false otherwise.
 */
async function IsOptionEnabled(GuildId) {
  const GuildData = await GuildModel.findOne({ id: GuildId });
  return !!GuildData.settings.login_restrictions;
}

// ------------------------------
module.exports = IsOptionEnabled;
