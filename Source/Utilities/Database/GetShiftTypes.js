const GuildModel = require("../../Models/Guild.js");

/**
 * Returns all created shift types for a given guild id
 * @param {String} GuildId
 * @returns {Promise<GuildShiftType[]>}
 */
async function GetShiftTypes(GuildId) {
  return GuildModel.findOne({ id: GuildId }, "settings.shift_settings.shift_types").then(
    (GuildData) => {
      if (!GuildData) return [];
      return GuildData.settings.shift_settings.shift_types;
    }
  );
}

// ----------------------------
module.exports = GetShiftTypes;
