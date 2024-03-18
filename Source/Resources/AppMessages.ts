/* eslint-disable sonarjs/no-duplicate-string */
import Dedent from "dedent";

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
      "Apologies; a server/application error occurred while executing this command. Please attempt again at a later time.",
  },

  /**
   * Can be shown to the end user if any database error has occurred.
   */
  DatabaseError: {
    Title: "Database Error",
    Description:
      "An error occurred while accessing the database. Please try again later or contact support.",
  },

  UnauthorizedInteraction: {
    Title: "Unauthorized",
    Description:
      "You are not permitted to interact with a prompt or process that somebody else has initiated.",
  },

  UnauthorizedCmdUsage: {
    Title: "Unauthorized",
    Description: "You do not have the necessary app permissions to utilize this command.",
  },

  /**
   * If the app/bot couldn't be found in the guild (when validating it's permissions).
   */
  AppNotFoundInGuildForPerms: {
    Title: "Error",
    Description:
      "Something went wrong, and the application could not be found on this server to validate its permissions.",
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
    Description: "You cannot delete the preserved shift type `Default`.",
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
   *
   */
  MaximumShiftTypesReached: {
    Title: "Maximum Shift Types Reached",
    Description:
      "The limit of ten shift types has been reached, and you cannot create any further.",
  },

  /**
   * Unauthorized shift type usage
   */
  UnauthorizedShiftTypeUsage: {
    Title: "Unauthorized",
    Description: "You do not have the necessary permission or role to use this shift type.",
  },

  /**
   * Unauthorized shift type usage
   */
  ShiftMustBeActive: {
    Title: "Shift Not Active",
    Description: "You have to be on an active shift to perform this action.",
  },

  /**
   * An error message to show when attempting to wipe shift records while there aren't any records to delete.
   */
  WipeAllNoShiftsFound: {
    Title: "No Shifts Found",
    Description:
      "It looks like there are currently no recorded shifts that match your search to be deleted.",
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
    Title: "Hold Up!",
    Description:
      "The input user, `%s`, cannot be found on Roblox. Please double-check the username and try again.",
  },

  /**
   * Roblox user already linked (for logging in)
   * @template RobloxUsername The logged in Roblox account's username.
   */
  RobloxUserAlreadyLinked: {
    Title: "Hold Up!",
    Description: "You are already logged in as `%s`.\nDid you mean to log out instead?",
  },

  /**
   *
   * @template RobloxUsername The username of the account.
   */
  RobloxUserVerificationFailed: {
    Title: "Verification Failed",
    Description:
      "Login verification as `%s` failed.\nPlease rerun the command and ensure you follow the appropriate instructions.",
  },

  /**
   * Roblox account not linked (for logging out)
   */
  LORobloxUserNotLinked: {
    Title: "Hold On!",
    Description:
      "To log out of the application, you must be logged in and have linked your Roblox account already.",
  },

  /**
   * Roblox account not linked (for shift management command; "duty manage")
   */
  SMRobloxUserNotLinked: {
    Title: "Hold On!",
    Description: "To mange shifts using the application, you must first link your Roblox account.",
  },

  /**
   * Roblox account not linked (general usage)
   */
  RobloxUserNotLinked: {
    Title: "Hold On!",
    Description:
      "You must first link your Roblox account using the `login` slash command to be able to use this command.",
  },

  /**
   * Roblox account not in-game (for starting a shift using shift management command; "duty manage")
   */
  SMRobloxUserNotInGame: {
    Title: "Hold On!",
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
    Description:
      "The shift with the ID you provided, `%s`, could not be found. It's possible that the shift was removed or the ID might be incorrect.",
  },

  UnknownRadioCode: {
    Title: "Unknown Radio Code",
    Description:
      "Could not find the typed radio code. Make sure you choose one from the autocomplete list.",
  },

  ACUnknownColor: {
    Title: "Unknown Color",
    Description: "Please choose and input a valid color from the autocomplete list provided.",
  },

  ACUnknownVehicle: {
    Title: "Unknown Vehicle",
    Description:
      "Please choose and input a valid vehicle model from the autocomplete list provided.",
  },

  MalformedPersonHeight: {
    Title: "Malformed Person Height",
    Description: "Please input a valid height in feet and inches (e.g., `5'7\"`).",
  },

  InvalidLicensePlate: {
    Title: "Invalid License Plate",
    Description:
      "A vehicle license plate must be 3 to 7 characters long and may consist of only letters, numerals, and a single hyphen in between.",
  },

  SelfArrestAttempt: {
    Title: "Hold On!",
    Description:
      "It appears like you're attempting to file an arrest report or report yourself. Please provide a valid suspect name and try again.",
  },

  SelfCitationAttempt: {
    Title: "Hang On!",
    Description:
      "The violator name must be someone other than the officer issuing the citation. Please double-check and input the correct violator's name to proceed.",
  },

  UnknownConfigTopic: {
    Title: "Error",
    Description: "An unknown configuration topic was received.",
  },

  GuildConfigNotFound: {
    Title: "Database Error",
    Description: "Something went wrong and the guild's current configuration could not be fetched.",
  },

  InvalidGuildChannelFormat: {
    Title: "Malformed Format",
    Description:
      "Kindly provide a valid channel format that consists of a server ID followed by a channel ID, and both are separated by a colon (:).",
  },

  /** For specifying citations/arrests external/outside log channels */
  NotJoinedInGuild: {
    Title: "Not Joined In Server",
    Description:
      "You cannot set up an external logging channel on a server on which you are not joined.",
  },

  /** For specifying citations/arrests external/outside log channels */
  InsufficientAdminPerms: {
    Title: "Insufficient Admin Perms",
    Description:
      "You lack administrative access to that server to configure one of its channels as an external logging channel. You must be an administrator on that server to proceed.",
  },

  /**
   * For specifying citations/arrests external/outside log channels
   * @template {String} GuildId The guild identifier provided.
   */
  DiscordGuildNotFound: {
    Title: "Server Not Found",
    Description:
      "The server with the ID `%s` is either not found, or the application does not have access to it.",
  },

  /**
   * For specifying citations/arrests external/outside log channels
   * @template {String} ChannelId The channel identifier provided.
   */
  DiscordChannelNotFound: {
    Title: "Channel Not Found",
    Description:
      "The channel with the `%s` ID couldn't be found on the specified server, or the channel is inaccessible by the application.",
  },

  MemberNotFound: {
    Title: "Member Not Found",
    Description:
      "The specified member could not be discovered on the server. Make sure you're entering a valid member.",
  },

  DBGuildDocumentNotFound: {
    Title: "Database Error",
    Description: "It seems like the guild document was not found in the database.",
  },

  BotMemberSelected: {
    Title: "Bot Member",
    Description: "You cannot select a bot member as a target. Please select a person instead.",
  },

  UnknownDateFormat: {
    Title: "Unknown Date Format",
    Description:
      "The date format entered is incorrect and/or unsupported. Please provide another relevant format.",
  },

  DateInFuture: {
    Title: "Date In The Future",
    Description:
      "It looks like the date you provided is in the future. Please provide a date from the past.",
  },

  FailedToVoidShift: {
    Title: "Shift Void Failed",
    Description:
      "It looks like the shift could not be voided. Please try again later or contact support.",
  },

  ShiftVoidMismatch: {
    Title: "Shift Mismatch",
    Description: "The current active shift does not match the shift being requested to be void.",
  },

  /**
   * Roles save not found for deletion
   */
  RolesSaveNotFoundFD: {
    Title: "Save Not Found",
    Description: "There was no save found with the provided identifier to delete.",
  },

  /**
   * Roles save with a specified id not found for a selected member
   */
  RolesSaveNotFoundFSM: {
    Title: "Save Not Found",
    Description:
      "There was no save found with the provided identifier for the selected user/member.",
  },

  /**
   * Roles save not found for a selected member
   */
  DBFailedToDeleteRolesSave: {
    Title: "Database Error",
    Description:
      "There was an error deleting this save. Please try again later or contact support.",
  },

  /**
   * No active shift for modification
   */
  NoActiveShiftFM: {
    Title: "No Active Shift",
    Description: "There is no active shift at this moment for the selected user to modify.",
  },

  InvalidShiftId: {
    Title: "Invalid Shift ID",
    Description:
      "The shift ID inputted is invalid. Please ensure that the provided ID is a valid 15-digit sequence.",
  },

  UnknownDurationExp: {
    Title: "Unknown Time",
    Description:
      "The format of the duration you have entered is either incorrect or not supported. Kindly attempt again using a different format.",
  },

  NotEnoughTimePassedAR: {
    Title: "Insufficient Time",
    Description:
      "The time that has passed since the date you entered is insufficient to complete this action. Please provide a date that is at least one day earlier than today.",
  },

  /**
   * Short typed duration (< 30 seconds)
   */
  ShortTypedDuration: {
    Title: "Short Duration",
    Description:
      "The duration you have entered is too short. Kindly specify a duration of at least 30 seconds.",
  },

  /**
   * Short typed duration (< 30 seconds)
   */
  ShiftTimeAlreadyReset: {
    Title: "Time Already Reset",
    Description: "The time for this shift has already been reset.",
  },

  NoRecentShifts: {
    Title: "No Recent Shifts",
    Description:
      "There are no recent records for the specified user to display the last shift for.",
  },

  InvalidPageNumber: {
    Title: "Invalid Page Number",
    Description: "The value you have entered is not valid for a page number.",
  },

  PageNotFoundWN: {
    Title: "Page Not Found",
    Description: "The page corresponding to the specified number does not exist.",
  },

  ArrestRecordNotFound: {
    Title: "Record Not Found",
    Description: "The arrest record corresponding to the specified booking number is non-existent.",
  },

  CitRecordNotFound: {
    Title: "Record Not Found",
    Description: "There is no citation found with the specified number.",
  },

  /**
   * For nickname searches and replaces
   */
  InvalidRegexSyntax: {
    Title: "Invalid Regex Syntax",
    Description: Dedent(`
      The regular expression provided is either invalid or unsupported. \
      Please ensure that it follows the correct syntax and try again.

      For more information on regular expressions, please refer to the [MDN documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions).
    `),
  },
};

export const InfoMessages = {
  /** General message to inform the user that a specific process/prompt has timed out. */
  ProcessTimedOut: {
    Title: "Timed Out",
    Description:
      "It looks like this process/prompt has timed out. Kindly reinstate if you'd like to continue.",
  },

  /**
   * Roles save not found for a selected member
   */
  RoleSavesNotFoundFSM: {
    Title: "Saves Not Found",
    Description: "There were no saves or backups found for the selected user.",
  },

  /**
   * @template {String} ConfigurationTopic
   */
  ConfigTopicNoChangesMade: {
    Title: "No Changes Made",
    Description: "There have been no alterations to the %s configuration of the app.",
  },

  NicknameRegexNoMatchingMembers: {
    Title: "Matching Members",
    Description: "There were no members found with that nickname regex.",
  },

  TimedOutConfigPrompt: {
    Title: "Timed Out",
    Description:
      "This configuration prompt has timed out. If you wish to continue with the process, please re-run the configuration command.",
  },

  NoShiftsFoundLeaderboard: {
    Title: "No Shifts Found",
    Description: "There were no shift records in the server to display a leaderboard for.",
  },

  NoShiftsFoundReport: {
    Title: "No Shifts Found",
    Description: "There were no shift records to create an activity report based on.",
  },

  NoShiftsFoundEndAll: {
    Title: "No Active Shifts",
    Description: "There are no active shifts at the moment to end.",
  },

  /**
   * No shifts wiped for specified user
   */
  NoShiftsWipedFU: {
    Title: "No Shifts Wiped",
    Description: "There were no shifts found that could be wiped for the specified user.",
  },
};
