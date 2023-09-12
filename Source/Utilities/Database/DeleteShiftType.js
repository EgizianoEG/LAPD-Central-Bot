const GuildModel = require("../../Models/Guild.js");
const AppError = require("../Classes/AppError.js");
// ----------------------------------------------------------------

/**
 * Deletes a specified shift type from the guild ID given.
 *
 * @param {String} Name - The name of the shift type to delete.
 * @param {String} GuildId - The ID of the guild where the shift type is to be deleted.
 * @returns Promise<AppError|import("mongoose").HydratedDocument<typeof GuildModel>>
 * - Returns the saved guild document after deletion if succeeded or an `AppError`
 * if an error occurred while executing.
 *
 * @example
 * // Example usage:
 * try {
 *   const result = await DeleteShiftType("Night Shift", "123456789012345678");
 *
 *   if (result instanceof Error) {
 *     // An error can be shown to the user
 *     console.log("an error has occurred:", result);
 *   } else {
 *     // deletion is successful
 *     console.log("Shift type deleted successfully:", result.settings);
 *   }
 * } catch (error) {
 *   // Server error:
 *   if (error instanceof AppError) {
 *     console.error("Error deleting shift type:", error.title, error.message);
 *   } else {
 *     console.error("Unexpected error:", error);
 *   }
 * }
 */
async function DeleteShiftType(Name, GuildId) {
  const GuildDoc = await GuildModel.findById(GuildId).select("settings.shifts.types").exec();
  const ShiftTypeIndex =
    GuildDoc?.settings.shifts.types.findIndex((ShiftType) => ShiftType.name === Name) ?? -1;

  if (!GuildDoc) {
    throw new AppError(
      "Database Error",
      `Couldn't find the guild document for guild id:${GuildId}`
    );
  }

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
