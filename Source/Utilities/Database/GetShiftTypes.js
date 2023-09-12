const GuildModel = require("../../Models/Guild.js");

/**
 * Returns all created shift types for a given guild id
 * @param {String} GuildId
 * @return {Promise<Utilities.Database.GuildShiftType[]>}
 */
async function GetShiftTypes(GuildId) {
  return GuildModel.findById(GuildId)
    .select("settings.shifts.types")
    .then((GuildData) => {
      return GuildData?.settings.shifts.types.toObject() ?? [];
    });
}

// ----------------------------
module.exports = GetShiftTypes;
