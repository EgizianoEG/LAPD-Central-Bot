const GuildModel = require("../../Models/Guild.js");

/**
 * Checks if a given guild has login restrictions enabled for its users
 * @param {String} GuildId
 * @returns {Promise<Boolean>} true if the guild has login restrictions; false otherwise.
 */
async function IsOptionEnabled(GuildId) {
  const GuildFound = await GuildModel.findOne({ guild_id: GuildId });
  return !!GuildFound.guild_settings.login_restrictions;
}

module.exports = IsOptionEnabled;
