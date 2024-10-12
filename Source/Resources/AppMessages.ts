/* eslint-disable sonarjs/no-duplicate-string */
import { Embeds, Emojis } from "@Config/Shared.js";
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
    Description: "An unknown error has occurred while processing your request.",
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
   * Something went wrong while attempting to link Roblox account with Bloxlink integration or there was no Roblox account linked with Bloxlink in the first place.
   */
  BloxlinkLinkingFailed: {
    Title: "Account Linking Failed",
    Description:
      "There was a problem linking your Roblox account using the Bloxlink integration. Please try again later, or attempt to log in manually.",
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
    Title: "A Shift Is Already Active",
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
    Description:
      "Something went wrong and the guild's current configuration could not be fetched. Please try again later or attempt to readd the application.",
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
    Title: "Bot Member Selected",
    Description:
      "You cannot select a bot as a target. Please choose a human member for this action.",
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
    Description:
      "The currently active shift does not match the shift you requested to void. You might want to contact a management person for assistance.",
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

  IncidentRecordNotFound: {
    Title: "Record Not Found",
    Description: "There is no incident report found with the specified number.",
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

  LOAAlreadyExists: {
    Title: "LOA Already Exists",
    Description: "You cannot request a leave of absence while you have an active or pending one.",
  },

  LOADurationTooLong: {
    Title: "LOA Duration Too Long",
    Description:
      "The leave duration you have entered is too long. Kindly specify a duration of at most 90 days (3 months).",
  },

  LOADurationTooShort: {
    Title: "LOA Duration Too Short",
    Description:
      "The length of the leave you have entered is too short. Kindly specify a duration of at least 1 day long.",
  },

  LOAExtDurationTooLong: {
    Title: "Extension Too Long",
    Description:
      "The extension duration you have entered is too long. Kindly specify a duration of at most 30 days (1 months).",
  },

  LOATotalDurationTooLong: {
    Title: "Leave Duration Too Long",
    Description:
      "The total duration of your leave of absence would be too long. Please specify an extension that ensures the total duration of your leave is less than or equal to 90 days (3 months).",
  },

  LOAExtDurationTooShort: {
    Title: "Extension Too Short",
    Description:
      "The length of the extension you have entered is too short. Kindly specify a duration of at least 12 hours.",
  },

  LOAExtensionNotFoundForReview: {
    Title: "Extension Request Not Found",
    Description:
      "There is no pending extension request for this leave of absence to modify or act upon at this time.",
  },

  NoActiveLOAOrExistingExtension: {
    Title: "No Active LOA Or Existing Extension",
    Description:
      "Either there is no active leave of absence or there is an existing extension for this leave at this time.",
  },

  LOAPreviouslyDenied: {
    Title: "LOA Previously Denied",
    Description:
      "You cannot request a leave of absence while the previous one was denied less than 3 hours ago.",
  },

  LOAPreviouslyCancelled: {
    Title: "LOA Previously Cancelled",
    Description:
      "You cannot request a leave of absence while the previous one was cancelled less than 1 hour ago.",
  },

  LOARecentlyEnded: {
    Title: "LOA Recently Ended",
    Description:
      "You cannot request a new leave of absence while the previous one was ended or terminated less than 1 hour ago.",
  },

  LOAAlreadyEnded: {
    Title: "Leave Already Ended",
    Description: "Your leave of absence has already ended.",
  },

  LOANotActive: {
    Title: "No Active Leave",
    Description: "There is no active leave of absence to modify or take action on at the moment.",
  },

  NoPendingLOAToCancel: {
    Title: "No Pending LOA",
    Description: "You don't have any pending leave of absence to cancel at the moment.",
  },

  LOAIsOverForExtension: {
    Title: "Leave of Absence Expired",
    Description:
      "It seems like your leave of absence has ended, thus you cannot request an extension. You can only request an extension while your leave of absence is still active.",
  },

  LOAExtensionLimitReached: {
    Title: "Extension Limit Reached",
    Description:
      "You cannot request an extension of your current leave of absence. Only one extension request is allowed per leave, regardless of whether it was approved, denied, or cancelled.",
  },

  LOAAdminExistingExtension: {
    Title: "Extension Limit Reached",
    Description:
      "You cannot extend this leave of absence further more. Only one extension is allowed per leave, regardless of whether it was approved, denied, or cancelled.",
  },

  LOAUnauthorizedManagement: {
    Title: "Unauthorized Leave Management",
    Description:
      "You are not authorized to take action or view information on this leave of absence unless you are a management or administrator member.",
  },

  LOAModuleDisabled: {
    Title: "Module Disabled",
    Description:
      "The leave of absence module is currently disabled. You cannot request, manage, or administrate a leave without it being enabled.",
  },

  DutyActivitiesModuleDisabled: {
    Title: "Module Disabled",
    Description:
      "The duty activities module is currently disabled. You cannot log any citations or arrests without it being enabled.",
  },

  ShiftManagementModuleDisabled: {
    Title: "Module Disabled",
    Description:
      "The shift management module is currently disabled. You cannot initiate any of duty commands without it being enabled.",
  },

  SANoShiftsToModify: {
    Title: "No Shifts To Modify",
    Description:
      "There are no shifts to modify for the selected user. Please ensure the user has shifts before attempting to modify them.",
  },

  /**
   * If there were no shifts under a specific type to modify.
   */
  SANoShiftsToModifyWithType: {
    Title: "No Shifts To Modify",
    Description:
      "There are no shifts of the specified type to modify for the selected user. Please ensure the user has shifts of that type before attempting to modify them.",
  },

  LogIncidentInvalidAttachments: {
    Title: "Invalid Attachment(s)",
    Description: Dedent(`
      One or more of the provided attachments are invalid. Please provide valid image or screenshot links (discord hosted).

      A valid image link hosted on Discord may begin with
      - \`https://cdn.discordapp.com/attachments/\` or,
      - \`https://media.discordapp.net/attachments/\`  
    `),
  },

  LogIncidentDatabaseInsertFailed: {
    Title: "Database Insert Failed",
    Description:
      "An error occurred while attempting to insert the incident report into the application database. Please try again later.",
  },

  /**
   * Indicates that the application sent the report log message is not the same as the running one,
   * which received the interaction to update/modify the report (a different application.)
   */
  UpdateIncidentReportAppNotAuthor: {
    Title: "Incorrect Action",
    Description:
      "A different application or user sent the target message. Ensure that you are using the command on an incident report message that was sent by the same application, and try again.",
  },

  /**
   * Indicates that there was no incident number included in the report log embed, making the application
   * unable to fetch the target incident report from the database. Could be caused by removing message embeds manually by users.
   */
  UpdateIncidentReportNoIncNum: {
    Title: "Incident Number Not Found",
    Description:
      "The incident report number could not be found in the report log message. Kindly ensure that you are targeting an incident report log message and that it remains intact prior to attempting to modify the corresponding report.",
  },

  /**
   * Due to the application settings on certain guilds, management can decide to delete duty logs automatically after a certain amount of time,
   * which may cause the target incident report to be deleted from the database. This message is shown when the application couldn't find the incident record.
   */
  UpdateIncidentReportIncNotFound: {
    Title: "Incident Not Found",
    Description:
      "The incident report you are trying to update doesn't seem to exist anymore in the application database. Kindly verify that the report was not deleted before attempting to update it.",
  },

  UpdateIncidentReportDBFailed: {
    Title: "Database Update Failed",
    Description:
      "An error occurred while attempting to update the incident report in the application database. Please try again later.",
  },

  UpdateIncidentReportNoMgmtPerms: {
    Title: "Insufficient Permission",
    Description:
      "You do not have permission to update or take action on this incident report. Only the report submitter or staff with management permissions can perform this action.",
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
    Description: "There have been no alterations to the %s module configuration of the app.",
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

  NoLOAsWithActiveStatus: {
    Title: "No Leaves of Absence",
    Description: "There are currently no active leave of absence to display.",
  },

  NoLOAsWithSpecifiedStatus: {
    Title: "No Leaves of Absences",
    Description: "There are currently no LOAs with the specified status to display.",
  },

  /**
   * Shift records deletion in progress
   */
  SRDeletionInProgress: {
    Thumb: null,
    Title: `${Emojis.LoadingBlue}\u{2000}Deleting Shifts...`,
    Description: "Please wait, this process might take a few seconds to complete.",
  },

  SRWipeAllInProgress: {
    Thumb: null,
    Title: `${Emojis.LoadingBlue}\u{2000}Wiping Shifts...`,
    Description: "Hang tight! This process might take a few seconds to complete.",
  },

  LRWipeAllInProgress: {
    Thumb: null,
    Title: `${Emojis.LoadingBlue}\u{2000}Wiping Leave Records...`,
    Description: "Hang tight! This process might take a few seconds to complete.",
  },

  /**
   * Leave records deletion in progress
   */
  LRDeletionInProgress: {
    Thumb: null,
    Title: `${Emojis.LoadingBlue}\u{2000}Deleting Leave Records...`,
    Description: "Please wait, this process might take a few seconds to complete.",
  },

  CreatingActivityReport: {
    Thumb: null,
    Title: `${Emojis.LoadingBlue}\u{2000}Creating Report...`,
    Description:
      "Please wait while your activity report is being created. This process may take a few seconds to complete.",
  },

  ProcessingCitationDetails: {
    Thumb: null,
    Color: Embeds.Colors.Gold,
    Title: `${Emojis.LoadingGold}\u{2000}Processing Details...`,
    Description: "Citation details are being processed and validated for submission, please wait.",
  },

  LoggingCitationRecord: {
    Thumb: null,
    Color: Embeds.Colors.Gold,
    Title: `${Emojis.LoadingGold}\u{2000}Logging Citation...`,
    Description: "Please wait while your submitted citation is processed and logged.",
  },
};
