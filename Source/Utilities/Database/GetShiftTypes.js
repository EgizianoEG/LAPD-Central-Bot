const GuildModel = require("../../Models/Guild.js");

/**
 * Returns all created shift types for a given guild id
 * @param {String} GuildId
 * @returns {Promise<Utilities.Database.GuildShiftType[]>}
 */
async function GetShiftTypes(GuildId) {
  return GuildModel.findById(GuildId, "settings.shifts.types").then((GuildData) => {
    if (!GuildData) return [];
    return GuildData.settings.shifts.types ?? [];
  });
}

// ----------------------------
module.exports = GetShiftTypes;
