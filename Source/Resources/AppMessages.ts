/**
 * A collection of error messages used throughout the application.
 *
 * Each error message has a unique name (e.g., MalformedShiftTypeName) and contains a title
 * and description. Some messages may include template placeholders (e.g., `%s`) for dynamic content.
 *
 * Usage example:
 * ```ts
 * import { format } from "node:util";
 *
 * const Message = ErrorMessages.ShiftTypeAlreadyExists;
 * const Formatted = format(Message.Description, "Evening Shift");
 * console.error(`${Message.Title}: ${Formatted}`);
 * ```
 */
export const ErrorMessages = {
  UnknownError: {
    Title: "Unknown Error",
    Description: "An unknown error has occurred.",
  },

  /**
   * Should be shown to the end user if any server/application/bot error has occurred.
   */
  AppError: {
    Title: "Error",
    Description:
      "Apologies, a server/application error occurred while executing this command. Please attempt again at a later time.",
  },

  /**
   * Can be shown to the end user if any database error has occurred.
   */
  DatabaseError: {
    Title: "Database Error",
    Description:
      "An error occurred while accessing the database. Please try again later or contact support.",
  },

  /**
   * Malformed shift type name
   */
  MalformedShiftTypeName: {
    Title: "Malformed Shift Type Name",
    Description:
      "The name of a shift type may only consist of letters, numerals, spaces, underscores, dashes, and periods.",
  },

  /**
   * Preserved shift type (for deletion)
   */
  PreservedShiftTypeDeletion: {
    Title: "Preserved Shift Type",
    Description: "Cannot delete the preserved shift type `Default`.",
  },

  /**
   * Preserved shift type (for creation)
   */
  PreservedShiftTypeCreation: {
    Title: "Preserved Shift Type Name",
    Description:
      "The name of the `Default` shift type is preserved and cannot be overridden, deleted, or created.",
  },

  /**
   * Shift type already exists (for creation)
   * @template InputShiftTypeName The name of the shift type provided by the user.
   */
  ShiftTypeAlreadyExists: {
    Title: "Shift Type Already Exists",
    Description:
      "There is already a shift type named `%s`. Please make sure you're creating a distinct shift type.",
  },

  /**
   * Nonexistent shift type (for usage)
   */
  NonexistentShiftTypeUsage: {
    Title: "Nonexistent Shift Type",
    Description:
      "A shift type with the provided name does not exist. Please ensure the entered type or use the default one.",
  },

  /**
   * Nonexistent shift type (for deletion)
   * @template InputShiftTypeName The name of the shift type provided by the user.
   */
  NonexistentShiftTypeDeletion: {
    Title: "Shift Type Not Found",
    Description: "The shift type `%s` does not exist in the server and cannot be deleted.",
  },

  /**
   * Unauthorized shift type usage
   */
  UnauthorizedShiftTypeUsage: {
    Title: "Unauthorized",
    Description: "You do not have the necessary permission/role to use this shift type.",
  },

  /**
   * Malformed Roblox username
   * @template InputUsername The username provided by the user.
   */
  MalformedRobloxUsername: {
    Title: "Malformed Username",
    Description:
      "The provided username, `%s`, is malformed.\nA Roblox username can be 3 to 20 characters long and can only contain letters, digits, and one underscore character in between.",
  },

  /**
   * Nonexistent Roblox username
   * @template InputUsername The username provided by the user.
   */
  NonexistentRobloxUsername: {
    Title: "Hold up!",
    Description:
      "The input user, `%s`, cannot be found on Roblox. Please double-check the username and try again.",
  },

  /**
   * Roblox user already linked (for logging in)
   * @template RobloxUsername The logged in Roblox account's username.
   */
  RobloxUserAlreadyLinked: {
    Title: "Hold up!",
    Description: "You are already logged in as `%s`.\nDid you mean to log out instead?",
  },

  /**
   * Roblox account not linked (for logging out)
   */
  LORobloxUserNotLinked: {
    Title: "Hold on!",
    Description:
      "To log out of the application, you must be logged in and have linked your Roblox account already.",
  },

  /**
   * Roblox account not linked (for shift management command; "duty manage")
   */
  SMRobloxUserNotLinked: {
    Title: "Hold on!",
    Description: "To mange shifts using the application, you must first link your Roblox account.",
  },

  /**
   * Roblox account not in-game (for starting a shift using shift management command; "duty manage")
   */
  SMRobloxUserNotInGame: {
    Title: "Hold on!",
    Description:
      "You cannot begin a new shift unless you are online and connected to the game server.",
  },

  /**
   * Users cannot have two active shifts at the same time even if their shift types are different.
   * @template ActiveShiftTypeName Type of the shift that currently active.
   */
  ShiftAlreadyActive: {
    Title: "A Shift Already Active",
    Description:
      "You cannot begin a new shift while you have an active one, even if the shift type is different. You currently have an active shift of the `%s` type.",
  },

  /**
   * Users cannot have two active shifts at the same time even if their shift types are different.
   * @template ProvidedShiftId The shift Id provided by the user.
   */
  NoShiftFoundWithId: {
    Title: "Shift Not Found",
    Description: "A shift with the ID you provided, `%s`, was not found.",
  },
};
