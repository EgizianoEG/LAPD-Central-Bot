import GuildModel from "@Models/Guild.js";
import AppError from "../Classes/AppError.js";

/**
 * Deletes a specified shift type from the guild ID given.
 *
 * @param Name - The name of the shift type to delete.
 * @param GuildId - The ID of the guild where the shift type is to be deleted.
 * @returns Promise<AppError|import("mongoose").HydratedDocument<typeof GuildModel>>
 * - Returns the saved guild document after deletion if succeeded or an `AppError`
 * if an error occurred while executing.
 *
 * @example
 * // Example usage:
 * try {
 *   const result = await DeleteShiftType("Night Shift", "123456789012345678");
 *
 *   // deletion was successful
 *   console.log("Shift type deleted successfully:", result.settings);
 * } catch (error) {
 *   // Server error:
 *   if (error instanceof AppError) {
 *     console.error("Error deleting shift type:", error.title, error.message);
 *   } else {
 *     console.error("Unexpected error:", error);
 *   }
 * }
 */
export default async function DeleteShiftType(Name: string, GuildId: string) {
  const GuildDoc = await GuildModel.findById(GuildId).select("settings.shifts.types").exec();
  const ShiftTypeIndex =
    GuildDoc?.settings.shifts.types.findIndex((ShiftType) => ShiftType.name === Name) ?? -1;

  if (!GuildDoc) {
    throw new AppError({
      Title: "Database Error",
      Message: `Couldn't find the guild document for guild id:${GuildId}`,
      Showable: true,
    });
  }

  if (ShiftTypeIndex === -1) {
    throw new AppError({
      Title: "Shift Type Not Found",
      Message: `The shift type \`${Name}\` does not exist in the server and cannot be deleted.`,
      Showable: true,
    });
  } else {
    GuildDoc.settings.shifts.types.splice(ShiftTypeIndex, 1);
    return GuildDoc.save();
  }
}
