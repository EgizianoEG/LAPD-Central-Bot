const GuildModel = require("../../Models/Guild.js");

/**
 * @typedef ShiftType
 * @property {String} name - The name of the shift type
 * @property {Array<String>} permissible_roles - An array of roles that are allowed to use this type
 */
// ----------------------------------------------------------------

/**
 * Returns all created shift types for a given guild id
 * @param {String} GuildId
 * @returns {Promise<ShiftType[]>}
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
