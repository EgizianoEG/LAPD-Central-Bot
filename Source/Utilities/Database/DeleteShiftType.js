const GuildModel = require("../../Models/Guild.js");
const AppError = require("../General/AppError.js");
// ----------------------------------------------------------------

/**
 * Deletes a specified shift type from the guild ID given.
 *
 * @param {String} Name - The name of the shift type to delete.
 * @param {String} GuildId - The ID of the guild where the shift type is to be deleted.
 * @returns {Promise<Document|AppError>} - Returns the saved guild document after deletion if succeeded or an `AppError` if the shift type does not exist.
 *
 * @example
 * // Example usage:
 * try {
 *   const result = await DeleteShiftType("Night Shift", "123456789012345678");
 *   console.log("Shift type deleted successfully:", result);
 * } catch (error) {
 *   if (error instanceof AppError) {
 *     console.error("Error deleting shift type:", error.title, error.message);
 *   } else {
 *     console.error("Unexpected error:", error);
 *   }
 * }
 */
async function DeleteShiftType(Name, GuildId) {
  const GuildDoc = await GuildModel.findOne({ id: GuildId }, "settings.shift_settings.shift_types");
  const ShiftTypeIndex = GuildDoc.settings.shift_settings.shift_types.findIndex(
    (ShiftType) => ShiftType.name === Name
  );

  if (ShiftTypeIndex !== -1) {
    GuildDoc.settings.shift_settings.shift_types.splice(ShiftTypeIndex, 1);
    return GuildDoc.save();
  } else {
    return new AppError(
      "Shift Type Not Found",
      `The shift type \`${Name}\` does not exist in the server and cannot be deleted.`
    );
  }
}

// ------------------------------
module.exports = DeleteShiftType;
