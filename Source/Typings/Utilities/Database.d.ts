import type { IncidentTypes, IncidentStatusesFlattened } from "@Resources/IncidentConstants.ts";
import type { Types, HydratedDocument, Model } from "mongoose";
import type { EyeColors, HairColors } from "@Resources/ERLCPDColors.ts";
import type { ShiftFlags } from "@Models/Shift.ts";
import type { Overwrite } from "utility-types";
import type ERLCAgeGroups from "@Resources/ERLCAgeGroups.ts";
import type AppError from "@Utilities/Classes/AppError.ts";

export namespace Guilds {
  interface CreateShiftTypeConfig {
    name: string;
    guild_id: string;
    is_default?: boolean;
    access_roles?: string[];
    created_on?: Date;
  }

  interface ShiftType {
    _id: Types.ObjectId;
    /** The unique shift type name. */
    name: string;
    /** Should this shift type be the default one? */
    is_default: boolean;
    /** All roles whose holders can utilize this duty shift type. */
    access_roles: string[];
    /** The date when this shift type was created. */
    created_on: Date;
  }

  interface GuildLogs {
    arrests: GuildArrests.ArrestRecord[];
    citations: GuildCitations.AnyCitationData[];
    incidents: [];
  }

  interface GuildSettings {
    /**
     * Whether or not staff members are required to link their Roblox account in order to execute specific set of commands.
     * By default, this is `true` and linking account is always required to use certain commands.
     */
    require_authorization: boolean;

    /**
     * **User Text Input Filtering Enabled**
     * Indicates whether user text input filtering is enabled. When enabled, the application will attempt to filter user-submitted text
     * to remove inappropriate content such as links, emails, and profanities before saving it to the database or sending it to logging channels.
     *
     * Note: This feature is not available for all application commands that require user input where it might not be necessary or desirable to filter.
     * @default true
     */
    utif_enabled: boolean;

    /**
     * Role permissions that will be used to limit the execution of specific commands and operations, by comparing the executor's roles to the ones in this object.
     * - Staff: Any member has one of the specified roles, authorized to use low-profile management commands and activities.
     * - Management: Any member has at least one of the specified roles, allowed to execute high-profile management commands and actions like wiping data, removing shifts, and managing leave notices.
     */
    role_perms: {
      staff: string[];
      management: string[];
    };

    shift_management: {
      /**
       * Whether or not the shift management module is enabled. The default value is `true`.
       * Disabling this module will prevent staff members from using its related slash commands (could include exceptions).
       */
      enabled: boolean;

      /**
       * The channel where the shift management module will send shift activities logs such as
       * the shift start and end events and any shift modification done by management staff.
       */
      log_channel?: string | null;

      /** Self-explanatory. */
      shift_types: Types.DocumentArray<Guilds.ShiftType>[];

      /** The roles that will be assigned to members when they start a shift or start a break while on shift. Maximum of two role IDs per shift state. */
      role_assignment: {
        on_duty: string[];
        on_break: string[];
      };
    };

    duty_activities: {
      /**
       * Whether or not the duty activities module is enabled. The default value is `false`.
       * Disabling this module will prevent staff members from using the `log arrest`, `log citation`, and `log incident` commands.
       */
      enabled: boolean;

      /* 
        The interval in milliseconds that the application will delete logged records of citations, arrests, and incidents
        if the current date minus the creation/reporting timestamp/date is greater than this value
        Defaults to 0, which means that no records will be deleted over time
        Value can be one of the following: `0 days` when disabled, `3 days`, `7 days`, `14 days`, and `30 days`
      */
      log_deletion_interval: number;

      /**
       * The logging channels for citations, arrests, and incidents.
       * For citations and arrests, it is possible to add a maximum of two channels (one local, one outside of the guild).
       * The following formats must be followed for these channels:
       * - `[Joined guild Id]:[Available channel's Id In that guild]` for outside channels;
       * - `[Channel Id]` for local channels (where the app is configured).
       *
       * Note: The application must be in the guild where the channels are and have the permissions to view and send messages in them to work properly.
       */
      log_channels: {
        citations: string[];
        arrests: string[];
        incidents?: string | null;
      };
    };

    leave_notices: {
      /**
       * Whether or not the leave notices module is enabled. The default value is `false`.
       * Disabling this module will prevent staff members from using the `loa-` commands (could include exceptions).
       */
      enabled: boolean;

      /**
       * The channel where the leave notice requests will be sent to for approval.
       * Leaving this field as `null` will not prevent staff members from requesting LOAs
       * but will result in management staff members not being aware about any new pending
       * requests unless done manually by slash commands.
       */
      requests_channel?: string | null;

      /**
       * The channel where any updates to leave notice requests will be sent to. This includes when the request is approved, denied, or cancelled.\
       * Could be left `null` if there is no need to log any updates.
       */
      log_channel?: string | null;

      /**
       * The role that will be assigned to members the moment their requests are approved and which will be removed when their LOA expires.
       * This could be left `null` if no role should be assigned.
       */
      leave_role?: string | null;
    };
  }

  interface GuildDocument {
    /** The Discord snowflake Id of the guild/server. */
    _id: string;

    /** The guild's logs. */
    logs: GuildLogs;

    /** The guild's configuration. */
    settings: GuildSettings;

    /** The date and time when the guild (the guild document) and it's associated data should be deleted from the database. */
    deletion_scheduled_on: Date | null;
  }
}

export namespace Shifts {
  type HydratedShiftDocument<IsActive extends boolean | undefined = undefined> = HydratedDocument<
    ShiftDocument<true, IsActive>,
    ShiftDocumentOverrides
  >;

  interface ShiftModel extends Model<Shifts.ShiftDocument, unknown, Shifts.ShiftDocumentOverrides> {
    /**
     * Starts a new shift for a user in a specific guild, ensuring that no duplicate active shifts exist.
     * This function atomically checks if the user already has an active shift (i.e., a shift without an `end_timestamp`)
     * and creates a new shift document if none exists. If an active shift is found, it throws an error.
     *
     * @param opts - An object containing the data required to start a new shift.
     *               - `user` (string, required): The id of the user starting the shift.
     *               - `guild` (string, required): The id of the guild in which the shift is being started.
     *               - `start_timestamp` (Date, optional): The timestamp when the shift started. Defaults to the current date and time
     *                  (there might be time difference between local machine and the received interaction).
     *               - `type` (string, optional): The type of shift. Defaults to `"Default"`.
     *               - Additional fields from `Shifts.ShiftDocument` can be included except for the `end_timestamp`, but they are optional.
     *
     * @returns A promise that resolves to the newly created shift document.
     * @throws {AppError} - If an active shift already exists for the user in the specified guild. The error contains a pre-formatted user-friendly message.
     */
    startNewShift(
      opts: Required<Pick<Shifts.ShiftDocument, "user" | "guild">> & Partial<Shifts.ShiftDocument>
    ): Promise<Shifts.HydratedShiftDocument<true>>;
  }

  interface ShiftDurations {
    /**
     * The total duration (on-duty and on-break sum) for the shift in milliseconds.
     * Notice that this is a `get` virtual and cannot be set/modified.
     */
    total: number;

    /**
     * On-duty shift duration in milliseconds.
     * This property is automatically calculated and cannot be set or modified.
     * Attempting to modify it will not do any change unless setting it to `-1`
     * which will set it to the automatically calculated value.
     */
    on_duty: number;

    /**
     * On-break shift duration in milliseconds.
     * This property is automatically calculated and cannot be set or modified.
     * Attempting to modify it will not do any change unless setting it to `-1`
     * which will set it to the automatically calculated value.
     */
    on_break: number;

    /**
     * For time modication purposes, a negative value indicates that the
     * on duty shift time will be decreased by the specified amount, and
     * a positive value indicates that the on duty shift time will be increased
     * by the specified amount (duration in ms).
     */
    on_duty_mod: number;
  }

  interface ShiftDocumentOverrides {
    durations: Types.Subdocument<undefined> & ShiftDurations;

    /**
     * Returns `true` if there is an active break; otherwise, `false`.
     */
    hasBreakActive(): boolean;

    /**
     * Returns `true` if there is any recorded break; otherwise, `false`.
     */
    hasBreaks(): boolean;

    /**
     * Increments a specified event by 1.
     * @param type - The event type to increment.
     * @returns The saved shift
     */
    incrementEvents(type: "arrests" | "citations"): Promise<this>;

    /**
     * Fetches the latest saved version (last state) of the shift document.
     * @param old_fallback - Whether or not to return the old shift document if fetching the latest fails.
     * @param silent - Whether or not to *not* throw an error if fetching the latest state fails. Defaults to `true`.
     * @returns The saved shift or `null` if it wasn't found on the database and `old_fallback` is `false`.
     */
    getLatestVersion<GOIFailed extends boolean = false>(
      old_fallback?: GOIFailed,
      silent?: boolean = true
    ): Promise<GOIFailed extends true ? this : this | null>;

    /**
     * Adds on-duty time to the shift.
     * @param duration - The amount of time to add in milliseconds.
     * @throws {AppError} User showable error if the shift wasn't found on the databse.
     * @returns The saved shift document after the modification.
     */
    addOnDutyTime(duration: number): Promise<this>;

    /**
     * Subtracts on-duty time from the shift.
     * @param duration - The amount of time to subtract in milliseconds.
     * @throws {AppError} User showable error if the shift wasn't found on the databse.
     * @returns The saved shift document after the modification.
     */
    subOnDutyTime(duration: number): Promise<this>;

    /**
     * {@link addOnDutyTime} and {@link subOnDutyTime} both compined in one method.
     * @param type - The action to perform.
     * @param duration - The amount of time to add or subtract in milliseconds.
     * @throws {AppError} User showable error if the shift wasn't found on the databse.
     * @returns The saved shift document after the modification.
     */
    addSubOnDutyTime(type: "Add" | "Sub" | "Subtract", duration: number): Promise<this>;

    /**
     * Adjusts the on-duty time of the shift.
     * @param duration - The duration to set in milliseconds.
     * @param current_timestamp - The timestamp to act based
     * on if the shift hasn't ended yet (default: Date.now()).
     *
     * @throws {AppError} User showable error if the shift wasn't found on the databse.
     * @returns The saved shift document after the modification.
     */
    setOnDutyTime(duration: number, current_timestamp?: number = Date.now()): Promise<this>;

    /**
     * Resets the shift time based on the current timestamp
     * @param current_timestamp - The timestamp to act based
     * on if the shift hasn't ended yet (default: Date.now()).
     *
     * @throws {AppError} User showable error if the shift wasn't found on the databse OR
     * if the shift's time already been reset (on-duty time is `0`).
     * @returns The saved shift document after the modification.
     */
    resetOnDutyTime(current_timestamp?: number = Date.now()): Promise<this>;

    /**
     * Starts and creates a new break if there is no one currently active.
     * @param timestamp - The start timestamp of the new break in milliseconds; the method's call timestamp is used by default.
     * @throws AppError if there is already an active break.
     * @returns A promise that resolves to the saved shift.
     */
    breakStart(timestamp?: number): Promise<this>;

    /**
     * Ends a currently active break if there is one.
     * @param timestamp - The break end timestamp in milliseconds; the method's call timestamp is used by default.
     * @throws AppError if there is no active break.
     * @returns A promise that resolves to the saved shift.
     */
    breakEnd(timestamp?: number): Promise<Overwrite<this, { events: ShiftEvents<false> }>>;

    /**
     * Ends the shift if it is still active.
     * @param timestamp - The shift end timestamp to set as a Date object or as a timestamp in milliseconds; defaults to the timestamp when the function was invoked.
     * @throws AppError if the shift is not active.
     * @returns A promise resolves to the saved shift
     */
    end(timestamp?: number | Date): Promise<this>;
  }

  interface ShiftEvents<BPA extends boolean = true> {
    /**
     * An array of breaks logged during the shift.
     * Each break is a tuple which has two values in the format: `[StartEpoch, EndEpoch]`
     * where `EndEpoch` is `null` by default which indicates a non finished break.
     */
    breaks: [number, BPA extends true ? number | null : number][];

    /** The number of arrests logged during this shift. */
    arrests: number;

    /** The number of incidents reported during this shift. */
    incidents: number;

    /** The number of citations logged during this shift. */
    citations: number;
  }

  interface ShiftDocument<
    BreaksPossiblyActive extends boolean = true,
    IsShiftActive extends boolean | undefined = undefined,
  > {
    /**
     * The unique identifier (15 digits) of this shift
     * where the first 13 digits indicates the timestamp
     * of this shift and the last 2 are randomly generated digits.
     */
    _id: string;

    /**
     * Represents the unique Discord snowflake identifier string for the user who has this shift.
     * This field could be populated by a `GuildProfile` document.
     * @required This field must be provided for every shift instance created.
     */
    user: string;

    /**
     * The guild that this shift instance/document belongs to.
     * This field could be populated by a `Guild` document.
     * @required This field must be provided for every shift instance created.
     */
    guild: string;

    /** The start timestamp of this shift; i.e. the time when this shift was created/initiated. */
    start_timestamp: Date;

    /** The end timestamp of this shift; defaults to `null` which indicates that this shift is currently active. */
    end_timestamp: IsShiftActive extends undefined
      ? Date | null
      : IsShiftActive extends true
        ? null
        : Date;

    /** The shift type; defaults to `"Default"`. */
    type: string;

    /**
     * Shift origin/source: `System` (auto), `Standard` (user),
     * `Imported` (external), or `Administrative` (manual override).
     */
    flag: keyof typeof ShiftFlags;

    /** The shift logged durations. */
    durations: ShiftDurations;

    /**
     * @virtual - Not stored in the database.
     * The on-duty time of this shift in a human-readable format.
     */
    on_duty_time: string;

    /**
     * @virtual - Not stored in the database.
     * The on-break time of this shift in a human-readable format.
     */
    on_break_time: string;

    /** Logged events during this shift. */
    events: ShiftEvents<BreaksPossiblyActive>;
  }
}

export namespace GuildProfiles {
  type HydratedProfileDocument = HydratedDocument<ProfileDocument, ProfileOverrides>;
  interface TotalDurationsData {
    /** A `get` virtual and cannot be set/modified. */
    all: number;
    /** All on-duty shift durations in milliseconds. */
    on_duty: number;
    /** All on-break shift durations in milliseconds. */
    on_break: number;
  }

  interface ProfileOverrides {
    total_durations: Types.Subdocument<undefined> & TotalDurationsData;
    average_periods: Types.Subdocument<undefined> & TotalDurationsData;
  }

  interface ProfileModelType extends Model<ProfileDocument, unknown, ProfileOverrides> {
    /**
     * Finds a document by the given filter. If no document is found, a new document is created.
     * @param {FilterQuery<GuildProfiles.ProfileDocument>} filter - The filter to find the document. The `guild` and `user`
     * fields must be present and of type `string` to correctly return the newly created document if wanted.
     * This means no usage of query operators is allowed for these two fields.
     * @param {ProjectionType<GuildProfiles.ProfileDocument>} [projection] - The projection to apply to the document if found.
     * Projection won't apply if the document is newly created.
     * @returns The found or newly created document.
     * @throws {AppError} Throws an error if the find or create operation fails.
     */
    findOneOrCreate: (
      filter: FilterQuery<ProfileDocument> & { guild: string; user: string },
      projection?: ProjectionType<ProfileDocument> | null
    ) => Promise<HydratedDocument<ProfileDocument>>;
  }

  interface ProfileDocument {
    /** The Discord user's unique identifier. */
    user: string;

    /** The Discord guild's unique identifier for thi specific profile. */
    guild: string;

    // /** Profile state. Mainly used for determining if the profile can be deleted or not. */
    // state: "active" | "inactive";

    // /** The profile's creation date. */
    // created_at: Date;

    /** Roblox linked account information. */
    linked_account: {
      roblox_user_id: number;
    };

    /** Leave of absence records. */
    loas: string[];

    shifts: {
      total_durations: TotalDurationsData;
      average_periods: TotalDurationsData;
      logs: string[];
    };
  }
}

export namespace LeaveOfAbsence {
  type LeaveStatus = "Pending" | "Approved" | "Denied" | "Cancelled";
  type LeaveModel = Model<LeaveOfAbsenceDocument, {}, DocumentMethods, DocumentVirtuals>;
  type LeaveOfAbsenceHydratedDocument = HydratedDocument<
    LeaveOfAbsence.LeaveOfAbsenceDocument,
    DocumentVirtuals & DocumentMethods
  >;

  interface DocumentMethods {
    /**
     * Fetches the latest version of the leave of absence document from the database.
     * This ensures that the document reflects the most up-to-date state.
     *
     * @returns A promise that resolves to the latest version of the leave of absence document.
     */
    getUpToDate(): Promise<LeaveOfAbsenceHydratedDocument>;
  }

  interface DocumentVirtuals {
    /**
     * @virtual - Not stored in the database.
     * Indicates whether the leave of absence is currently active.
     * This is determined based on the current date and the `end_date` field.
     */
    is_active: boolean;

    /**
     * @virtual - Not stored in the database.
     * Indicates whether the leave of absence has ended.
     * This is determined based on the current date and the `end_date` field.
     */
    is_over: boolean;

    /**
     * @virtual - Not stored in the database.
     * Indicates whether the leave of absence has been approved.
     * This is based on the `status` field being set to `"Approved"` and the presence of a `review_date`.
     */
    is_approved: boolean;

    /**
     * @virtual - Not stored in the database.
     * Returns the actual duration of the leave of absence in a human-readable format.
     * This considers any early end or approved extensions.
     */
    duration_hr: string;

    /**
     * @virtual - Not stored in the database.
     * Returns the original duration of the leave of absence in a human-readable format.
     * This is calculated as the duration between the `review_date` (start date) and the `end_date`.
     */
    original_duration_hr: string;

    /**
     * @virtual - Not stored in the database.
     * Returns the extended duration of the leave of absence in a human-readable format.
     * This does not include the original duration and is independent of whether the extension was approved.
     */
    extended_duration_hr: string;
  }

  interface LeaveOfAbsenceDocument {
    _id: Types.ObjectId;

    /**
     * The Discord snowflake ID of the user who requested the leave of absence.
     * This can optionally be populated by a `GuildProfile` document.
     */
    user: string;

    /**
     * The Discord snowflake ID of the guild where the leave of absence was requested.
     * This can optionally be populated by a `Guild` document.
     */
    guild: string;

    /**
     * The current status of the leave of absence.
     * - `Pending`: The leave request is awaiting review.
     * - `Approved`: The leave request has been approved.
     * - `Denied`: The leave request has been denied.
     * - `Cancelled`: The leave request has been cancelled by the requester.
     */
    status: LeaveStatus;

    /**
     * The reason provided by the requester for the leave of absence.
     */
    reason: string;

    /**
     * The original duration of the leave of absence in milliseconds.
     * This value remains unchanged even if the leave ends early.
     */
    duration: number;

    /**
     * Indicates whether the leave of absence's end has been processed.
     * This includes logging the leave's end and updating the requester's roles.
     * Defaults to `false`.
     */
    end_handled: boolean;

    /**
     * Indicates whether the leave of absence is manageable by the requester.
     * If `false`, only management staff can modify or control the leave.
     */
    is_manageable: boolean;

    /**
     * The date when the leave of absence is scheduled to end.
     * This value is updated when the leave is approved, saved, or extended.
     */
    end_date: Date;

    /**
     * The date when the leave of absence ended, regardless of its original duration.
     * This is set only if the leave ended early.
     */
    early_end_date: Date | null;

    /**
     * The reason provided by management staff for ending the leave early.
     * This is set only if the leave ended early.
     */
    early_end_reason: string | null;

    /**
     * The date when the leave of absence was requested.
     * This field is read-only once the leave is recorded.
     */
    request_date: Date;

    /**
     * The message associated with the leave of absence request.
     * This is used for editing requests that are cancelled and not yet reviewed.
     * Format: `[ChannelID]:[MessageID]`.
     */
    request_msg: string | null;

    /**
     * A request to extend the leave of absence, if any.
     * This has the same structure as the leave request but omits certain fields.
     */
    extension_req: {
      /** The date when the extension request was made. */
      date: Date;

      /** The requested extension duration in milliseconds. */
      duration: number;

      /** The status of the extension request. */
      status: LeaveStatus;

      /** The reason provided for the extension request. */
      reason?: string | null;

      /** The message associated with the extension request. */
      request_msg?: string | null;

      /** The date when the extension request was reviewed. */
      review_date?: Date | null;

      /** Notes or comments provided by the reviewer. */
      reviewer_notes?: string | null;

      /** Information about the reviewer who handled the extension request. */
      reviewed_by?: {
        /** The Discord user's unique identifier. */
        id: string;

        /** The Discord user's username. */
        username: string;
      } | null;
    } | null;

    /**
     * Notes or comments provided by the reviewer during the approval or denial process.
     */
    reviewer_notes: string | null;

    /**
     * The date when the leave of absence was reviewed.
     * This could also be set to the date when the leave was cancelled by the requester.
     */
    review_date: Date | null;

    /**
     * Information about the reviewer who handled the leave of absence.
     * This is `null` if the leave has not yet been reviewed.
     */
    reviewed_by: {
      /** The Discord user's unique identifier. */
      id: string;

      /** The Discord user's username. */
      username: string;
    } | null;
  }
}

export namespace GuildCitations {
  type CitationType = "Warning" | "Fine";
  interface WarningCitationData {
    /** Citation number. */
    num: number;

    /** The Discord snowflake Id of the guild where this citation was issued. */
    guild: string;

    /** The date of violation or citation. */
    issued_on: Date;

    /** Date of violation or citation issuing date. */
    dov: string;

    /** Time of violation or citation issuing time in 12 hour format with hours and minutes (10:45). */
    tov: string;

    /** The day of week of the citation in numeric format (1 to 7); e.g, 1: Sunday, 7: Saturday. */
    dow: number;

    /** The day period of the citation ("AM" or "PM"). */
    ampm: "AM" | "PM";

    /** The direct image url of the filled citation; if any. */
    img_url: string | null;

    /** The location of violation(s) stated. A maximum of 70 characters. */
    violation_loc: string;

    /** Who issued the citation */
    citing_officer: CitingOfficerInfo;

    /**
     * A list of violations. A violation text shall have the following format: "XXX(A) CVC - XXX".
     * Where it contains the violation vehicle/penal code and it's description.
     */
    violations: (string | Violation)[];
    violator: ViolatorInfo;
    vehicle: VehicleInfo;
  }

  interface FineCitationData extends WarningCitationData {
    /** The amount of the fine in US dollars. This field is only applicable to fine citations not to warnings */
    fine_amount: number;
  }

  interface AnyCitationData extends WarningCitationData, PartialAllowNull<FineCitationData> {
    type: GuildCitations.CitationType;
  }

  interface InitialProvidedCmdDetails extends PartialAllowNull<AnyCitationData> {
    violator: Omit<ViolatorInfo, "address" | "id"> & Partial<ViolatorInfo>;
    vehicle: Omit<VehicleInfo, "body_style" | "make" | "year"> & Partial<VehicleInfo>;
  }

  interface CitingOfficerInfo {
    /** Discord user Id */
    discord_id: string;
    /** Roblox user Id */
    roblox_id: number;
    /** Roblox username */
    name: string;
    /** Roblox display name */
    display_name: string;
  }

  interface Violation {
    /** Whether the violation is correctable or not */
    correctable?: boolean;
    /** The violation text itself */
    violation: string;
    /** Violation type. Either a misdemeanor (M) or normal infraction (I) */
    type?: "M" | "I";
  }

  interface ViolatorInfo {
    /** Roblox user Id */
    id: number;

    /** The name of the violator. Recommended to use the format: `[RobloxDisplayName] (@[RobloxUsername])` */
    name: string;

    /** The age group of the violator */
    age: (typeof ERLCAgeGroups)[number]["name"];

    gender: "Male" | "Female" | "M" | "F";

    /** Hair color */
    hair_color: (typeof HairColors)[number]["abbreviation"];

    /** Eye color */
    eye_color: (typeof EyeColors)[number]["abbreviation"];

    /** Height in the format of feet and inches (5'7") */
    height: `${number}'${number}` | string;

    /** Weight in pounds (lbs) */
    weight: number;

    /** Residence city */
    city: string;

    /** Residence address */
    address: string;

    /** The driving license number itself; not the *vehicle* license/plate number */
    lic_num: string;

    /** The driving license class */
    lic_class: string;

    /** Whether the driving license is commercial or not */
    lic_is_comm: boolean;
  }

  interface VehicleInfo {
    body_style: string;
    lic_num: string;
    year: string;
    make: string;
    model: string;
    color: string;
  }
}

export namespace GuildArrests {
  interface ArrestRecord {
    /** The arrest id. Also used as the booking number. */
    _id: number;

    /** The guild where the arrest was made. */
    guild: string;

    /** The booking number. */
    booking_num: number;

    /** The date when the arrest report was made. */
    made_on: Date;

    /** Any notes provided by the arresting officer. */
    notes: string | null;

    /** Detailed information about the arrestee. */
    arrestee: ArresteeInfo;

    /** An array of arresting officers' discord ids who assisted with the arrest. */
    assisting_officers: string[];
    arresting_officer: ArrestingOfficerInfo;
  }

  interface ArresteeInfo {
    /**
     * The formatted Roblox name of the arrestee (to use as a fallback if applicable when getting the username from id fails).
     * It's Recommended to use the format: `[RobloxDisplayName] (@[RobloxUsername])`.
     */
    formatted_name: string;
    roblox_id: number;
    gender: "Male" | "Female" | "M" | "F";

    /** A direct image url of the mugshot of the arrestee. */
    mugshot_url: string;

    /** The height in the format of feet and inches (5'7"). */
    height: string;

    /** The weight in pounds (lbs). */
    weight: number;

    /** The age group of the arrestee. */
    age_group: (typeof ERLCAgeGroups)[number]["name"];

    /** A list of charges which have already been formatted. */
    charges: string[];
  }

  interface ArrestingOfficerInfo {
    roblox_id: number;
    discord_id: string;
    formatted_name: string;
  }
}

export namespace GuildIncidents {
  type IncidentType = (typeof IncidentTypes)[number];
  type IncidentStatus = (typeof IncidentStatusesFlattened)[number];

  interface OfficerInvolved {
    /** The Roblox user id. */
    roblox_id: number;

    /** The Roblox username. */
    roblox_username: string;

    /** The Roblox display name. */
    roblox_display_name: string;

    /** The Discord user id. */
    discord_id: string;

    /** The Discord username. */
    discord_username: string;
  }

  interface IncidentRecord {
    _id: Types.ObjectId;

    /**
     * The incident number.
     * Format: `YY-NNNNN`
     * Where `YY` is the last two digits of the year and `NNNNN` is a (five/six)-digit sequential number assigned to each report.
     * Example: `25-00001`
     */
    num: string;

    guild: string;
    type: GuildIncidents.IncidentType;
    log_message?: string | null;
    reported_on: Date;

    notes?: string | null;
    location: string;
    description: string;
    status: IncidentStatus;
    reporter: OfficerInvolved;

    /** A list of involved suspects (could be Roblox usernames). */
    suspects: string[];

    /** A list of incident victims (could be Roblox usernames). */
    victims: string[];

    /** A list of incident witnesses (could be Roblox usernames). */
    witnesses: string[];

    /** A list of involved officers. Can contain Roblox usernames (leading with @) or Discord IDs. */
    officers: string[];

    /**
     * An array of image urls of the incident.
     * Not currently and shouldn't be used due to possible misuse of the feature.
     */
    attachments: string[];

    last_updated: Date;
    last_updated_by?: Pick<OfficerInvolved, "discord_id" | "discord_username"> | null;
  }
}

export namespace AggregateResults {
  interface GetCitationNumbers {
    _id: string;
    num: number;
    autocomplete_label: string;
  }
  [];

  interface GetIncidentNumbers {
    _id: string;
    num: string;
    autocomplete_label: string;
  }
  [];

  interface GetBookingNumbers {
    _id: string;
    num: number;
    autocomplete_label: string;
  }
  [];

  interface GetUserRecords {
    arrests: GuildArrests.ArrestRecord[];
    citations: GuildCitations.AnyCitationData[];

    total_arrests: number;
    total_citations: number;
    recent_arrest: GuildArrests.ArrestRecord | null;
    recent_citation: GuildCitations.AnyCitationData | null;

    /**
     * The incidents where the user is identified as a suspect.
     * These records have only the `num` field included. Could be counted if needed.
     */
    incidents_as_suspect: GuildIncidents.IncidentRecord[];
  }

  /** Without the highest role or name of the user. */
  interface BaseActivityReportData {
    records: Omit<ActivityReportRecord, "role" | "username" | "display_name">[];
    statistics: ActivityReportStatistics;
  }

  /**
   * @template T - The type of the total time and the time of the shift durations.
   */
  interface ActivityReportData<T extends number | string = number> {
    records: ActivityReportRecord<T>[];
    statistics: ActivityReportStatistics<T>;
  }

  interface ActivityReportRecord<T extends number | string = number> {
    /** The Discord user id. */
    id: string;

    /** The highest role name. */
    role: string;

    /** The current username. */
    username: string;

    /** The current nickname in the server (fallback to display name.) */
    display_name: string;
    total_shifts: number;
    total_time: T;

    recent_loa: Pick<
      LeaveOfAbsence.LeaveOfAbsenceDocument,
      | "status"
      | "request_date"
      | "review_date"
      | "end_date"
      | "reviewed_by"
      | "early_end_date"
      | "extension_req"
    > | null;

    quota_met: boolean;

    /** The total number of incidents reported. */
    incidents: number;

    /** Total number of citations issued. */
    citations: number;

    /** Total number of arrests made. */
    arrests: number;

    /** Total number of arrests assisted. */
    arrests_assisted: number;
  }

  interface ActivityReportStatistics<T extends number | string = number> {
    /** Total on duty time compined. */
    total_time: T;

    /** Total shifts recorded. */
    total_shifts: number;
  }
}
