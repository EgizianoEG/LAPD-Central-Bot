import type { Types, HydratedDocument, HydratedArraySubdocument, Model } from "mongoose";
import type { DeepPartial, Falsey, Overwrite } from "utility-types";
import type ERLCAgeGroups from "@Resources/ERLCAgeGroups.ts";
import type IncidentTypes from "@Resources/IncidentTypes.ts";
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
    callsigns: [];
  }

  interface GuildSettings {
    /**
     * Whether or not staff members are required to link their Roblox account in order to execute specific set of commands.
     * By default, this is `true` and linking account is always required to use certain commands.
     */
    require_authorization: boolean;

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
        incidents: string;
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

  interface GuildDocument {}
}

export namespace Shifts {
  type HydratedShiftDocument<IsActive extends boolean | undefined = undefined> = HydratedDocument<
    ShiftDocument<true, IsActive>,
    ShiftDocumentOverrides
  >;

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
  type Virtuals = "duration_hr" | "original_duration_hr" | "extended_duration_hr";
  type LeaveModel = Model<LeaveOfAbsenceDocument, {}, DocumentMethods, DocumentVirtuals>;
  type LeaveOfAbsenceHydratedDocument = HydratedDocument<
    LeaveOfAbsence.LeaveOfAbsenceDocument,
    DocumentVirtuals & DocumentMethods
  >;

  interface DocumentMethods {
    /**
     * Returns the leave of absence document with the latest data from the database.
     */
    getUpToDate(): Promise<LeaveOfAbsenceHydratedDocument>;
  }

  interface DocumentVirtuals {
    /**
     * @virtual - Not stored in the database.
     * Indicates if the leave of absence is active or not. `new Date()` is used.
     */
    is_active: boolean;

    /**
     * @virtual - Not stored in the database.
     * Indicates if the leave of absence has ended or not. `new Date()` is used.
     */
    is_over: boolean;

    /**
     * @virtual - Not stored in the database.
     * Indicates if the leave of absence is approved or not based on the `status` and `review_date` fields.
     */
    is_approved: boolean;

    /**
     * @virtual - Not stored in the database.
     * Returns the leave's actual duration in human readable format, taking into considration if it was ended early and if it was extended.
     */
    duration_hr: string;

    /**
     * @virtual - Not stored in the database.
     * Returns the original duration (`duration` field) of the leave in a human readable format.
     * (i.e. the duration between the review (start) date and end date).
     */
    original_duration_hr: string;

    /**
     * @virtual - Not stored in the database.
     * Returns a human readable duration of the leave of absence's extended duration (without adding the leave's actual/original duration).
     */
    extended_duration_hr: string;
  }

  interface LeaveOfAbsenceDocument {
    _id: Types.ObjectId;

    /** The Discord snowflake Id of the one who requested this leave of absence. Could be populated by a `GuildProfile` document. */
    user: string;

    /** The Discord snowflake Id of the guild where this leave of absence was requested. Could be populated by a `Guild` document. */
    guild: string;

    /**
     * The status of the leave of absence.
     * - Can be one of: `Pending`, `Approved`, `Denied`, `Cancelled`.
     * - There is not status to state if the leave has ended/on-going or not.
     */
    status: LeaveStatus;

    /** The reason for the leave of absence as stated by the requester. */
    reason: string;

    /** The original set duration of the leave of absence in milliseconds regardless if it was ended early or not. */
    duration: number;

    /** Indicates whether or not the leave of absence end has been handled; i.e. the process of logging leave end and updating the requester's roles. Defaults to `false`. */
    end_handled: boolean;

    /** Whether or not the leave of absence is manageable by the requester or the one who has this leave of absence. If not, only management staff can control it. */
    is_manageable: boolean;

    /** The date when the leave of absence supposed to end. This value will be updated once the LOA is approved and saved. */
    end_date: Date;

    /** The date when the leave of absence was ended regardless of its set duration. This is an optional field and should be set only when the LOA was early ended. */
    early_end_date: Date | null;

    /** The reason provided by *management* staff for the early end of the leave of absence. This is an optional field and should be set only when the LOA was early ended. */
    early_end_reason: string | null;

    /** The date when the leave of absence was requested. This is a read-only field once the LOA is requested/recorded. */
    request_date: Date;

    /** The leave of absence sent request message. This value is specifically being used for editing requests when they are cancelled and haven't been reviewed. */
    request_msg: string | null;

    /** A request to extend the leave of absence if any. Has the same structure as the leave request but with emitting fields. */
    extension_req: {
      /** The date of the extension request. */
      date: Date;

      /** The extension request's duration in milliseconds. */
      duration: number;

      /** The extension reason provided by who has the leave of absence. */
      status: LeaveStatus;
      reason?: string | null;
      request_msg?: string | null;
      review_date?: Date | null;
      reviewer_notes?: string | null;
      reviewed_by?: {
        id: string;
        username: string;
      } | null;
    } | null;

    /** The reason, note, or comment on the LOA approval or denial. */
    reviewer_notes: string | null;

    /** The date when the leave of absence was reviewed. This could be set to the date when the leave was cancelled by the requester themselves. */
    review_date: Date | null;

    /**
     * The information of who reviewed the leave of absence. This could be `null` if the LOA was not yet reviewed.
     */
    reviewed_by: {
      /** The Discord user's unique identifier of who reviewed the LOA. */
      id: string;

      /** The Discord user's username of who reviewed the LOA. */
      username: string;
    } | null;
  }
}

export namespace GuildCitations {
  type CitationType = "Warning" | "Fine";
  interface WarningCitationData {
    /** Citation number. */
    num: number;

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
    img_url: string;

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

  interface AnyCitationData extends WarningCitationData, Partial<FineCitationData> {
    type: GuildCitations.CitationType;
  }

  interface CitPartialData {
    violator: Pick<ViolatorInfo, "name" | "id"> & Partial<ViolatorInfo>;
    vehicle: VehicleInfo;
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
  type IncidentStatus = "Active" | "Closed" | "Resolved";

  interface OfficerInvolved {
    /** The Roblox user id. */
    id: number;

    /** The Roblox username. */
    username: string;

    /** The Roblox display name. */
    display_name: string;

    /** The Discord user id. */
    discord_id: string;
  }

  interface IncidentRecord {
    _id: number;
    type: GuildIncidents.IncidentType;
    made_on: Date;

    notes?: string | null;
    location: string;
    description: string;
    status: IncidentStatus;
    reported_by: OfficerInvolved;

    /** A list of involved suspects. */
    suspects: string[];

    /** A list of possible involved victims. */
    victims: string[];

    /** A list of involved officers. */
    officers: Omit<OfficerInvolved, "discord_id">[];

    /**
     * An array of image urls of the incident.
     * Not currently and shouldn't be used due to possible misuse of the feature.
     */
    attachments: string[];
  }
}

export namespace AggregateResults {
  interface GetCitationNumbers {
    citations: {
      num: string;
      autocomplete_label: string;
    }[];
  }

  interface GetBookingNumbers {
    bookings: {
      num: string;
      autocomplete_label: string;
    }[];
  }

  interface GetCitationRecord {
    citation: GuildCitations.AnyCitationData;
  }

  interface GetArrestRecord {
    arrest: GuildArrests.ArrestRecord;
  }

  interface GetUserRecords {
    arrests: GuildArrests.ArrestRecord[];
    citations: GuildCitations.AnyCitationData[];

    total_arrests: number;
    total_citations: number;
    recent_arrest: GuildArrests.ArrestRecord | null;
    recent_citation: GuildCitations.AnyCitationData | null;
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
