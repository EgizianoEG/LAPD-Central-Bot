const GuildModel = require("../../Models/Guild.js");
const AppError = require("../Classes/AppError.js");
// ----------------------------------------------------------------

/**
 * Deletes a specified shift type from the guild ID given.
 *
 * @param {String} Name - The name of the shift type to delete.
 * @param {String} GuildId - The ID of the guild where the shift type is to be deleted.
 * @returns {Promise<import("mongoose").Document|AppError>} - Returns the saved guild document after deletion if succeeded or an `AppError` if the shift type does not exist.
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
  const GuildDoc = await GuildModel.findById(GuildId, "settings.shifts.types").exec();

  const ShiftTypeIndex = GuildDoc.settings.shifts.types.findIndex(
    (ShiftType) => ShiftType.name === Name
  );

  if (ShiftTypeIndex === -1) {
    return new AppError(
      "Shift Type Not Found",
      `The shift type \`${Name}\` does not exist in the server and cannot be deleted.`
    );
  } else {
    GuildDoc.settings.shifts.types.splice(ShiftTypeIndex, 1);
    return GuildDoc.save();
  }
}

// ------------------------------
module.exports = DeleteShiftType;
