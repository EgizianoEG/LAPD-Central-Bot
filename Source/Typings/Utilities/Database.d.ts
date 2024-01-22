import type { DeepPartial, Falsey, Overwrite } from "utility-types";
import type { Types, HydratedDocument, HydratedDocumentFromSchema } from "mongoose";
import ArrestSchema from "@Models/Schemas/Arrest.ts";

export namespace ExtraTypings {
  export type HydratedShiftDocument = HydratedDocument<ShiftDocument, ShiftDocOverrides>;
  export interface TotalDurationsData {
    /** A `get` virtual and cannot be set/modified. */
    all: number;
    /** All on-duty shift durations in milliseconds. */
    on_duty: number;
    /** All on-break shift durations in milliseconds. */
    on_break: number;
  }

  export interface ArrestRecord {
    _id: string;
    gender: "Male" | "Female";
    height: string;
    weight: string;
    charges: string;
    age_group: 1 | 2 | 3 | 4 | 5;
    defendant_roblox_id: number;
    defendant_roblox_name: string;
    arresting_officer_roblox_id: string;
    arresting_officer_discord_id: string;
    arresting_officer_roblox_name: string;
  }

  export interface GuildLogs {
    arrests: ArrestRecord[];
    citations: [];
    callsigns: [];
  }

  export interface GuildSettings {
    require_authorization: boolean;

    log_channels: {
      citations: string | null;
      arrests: string | null;
      shift_activities: string | null;
    };

    role_perms: {
      staff: string[];
      management: string[];
    };

    shifts: {
      types: GuildShiftType[];
      role_assignment: {
        on_duty: string[];
        on_break: string[];
      };
    };

    durations: {
      total_max: number;
      on_break_max: number;
    };
  }

  export interface ShiftDurations {
    /**
     * The total duration (on-duty and on-break sum) for the shift in milliseconds.
     * Notice that this is a `get` virtual and cannot be set/modified.
     */
    total: number;
    /** On-duty shift duration in milliseconds. */
    on_duty: number;
    /** On-break shift duration in milliseconds. */
    on_break: number;
  }

  export interface ShiftDocOverrides {
    durations: Types.Subdocument<undefined> & ShiftDurations;

    /**
     * Returns `true` if there is an active break; otherwise, `false`.
     */
    isBreakActive(): boolean;

    /**
     * Updates the shift durations.
     * This method should be called before any usage of the shift's `durations` field.
     */
    updateDurations(): void;

    /**
     * Increments a specified event by 1.
     * @param type - The event type to increment.
     * @returns The saved shift
     */
    incrementEvents(type: "arrests" | "citations"): Promise<this>;

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

  export interface LogicalOperations {
    $and: boolean;
    $or: boolean;
    $not: boolean;
    $nor: boolean;
  }

  export interface ShiftEvents<BPA extends boolean = true> {
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

  export interface ShiftDocument<BreaksPossiblyActive extends boolean = true> {
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
    end_timestamp: Date | null;

    /** The shift type; defaults to `"Default"`. */
    type: string;

    /** The shift logged durations. */
    durations: ShiftDurations;

    /** Logged events during this shift. */
    events: ShiftEvents<BreaksPossiblyActive>;
  }

  export interface GuildProfileOverrides {
    total_durations: Types.Subdocument<undefined> & TotalDurationsData;
    average_periods: Types.Subdocument<undefined> & TotalDurationsData;
  }

  export interface GuildProfileDocument {
    /** The Discord user's unique identifier. */
    user_id: string;

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

    shifts: {
      total_durations: TotalDurationsData;
      average_periods: TotalDurationsData;
      logs: string[];
    };
  }

  export interface CreateShiftTypeConfig {
    name: string;
    guild_id: string;
    is_default?: boolean;
    permissible_roles?: string[];
  }

  export interface GuildShiftType {
    _id: Types.ObjectId;
    /** The unique shift type name. */
    name: string;
    /** Should this shift type be the default one? */
    is_default: boolean;
    /** All roles whose holders can utilize this duty shift type. */
    permissible_roles: string[];
    /** The date when this shift type was created. */
    created_at: Date;
  }

  /** Bot (application) or guild management/staff permissions.
   * If a boolean value given to a parent property, it acts like logical OR
   * meaning that if the object is `{ management: true }`; then the check will succeed
   * if the user has one of the permissions for management (guild scope or app scope); otherwise it will fail.
   */
  export interface UserPermissionsConfig extends Pick<LogicalOperations, "$and" | "$or"> {
    management:
      | boolean
      | ({
          guild: boolean;
          app: boolean;
        } & Pick<LogicalOperations, "$and" | "$or">);

    staff: boolean;
    // | ({
    //     guild?: boolean;
    //     app?: boolean;
    //   } & Pick<LogicalOperations, "$and" | "$or">);
  }
}

declare global {
  namespace Utilities.Database {
    type HydratedShiftDocument = ExtraTypings.HydratedShiftDocument;
    type ShiftDocument = ExtraTypings.ShiftDocument;
    type GuildShiftType = ExtraTypings.GuildShiftType;
    type UserPermissionsData = ExtraTypings.UserPermissionsConfig;
  }
}
