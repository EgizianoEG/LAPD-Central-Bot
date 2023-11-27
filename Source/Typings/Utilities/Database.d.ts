import AppError from "@Utilities/Classes/AppError.ts";
import type { Falsey } from "utility-types";
import type {
  Types,
  Schema,
  Document,
  InferSchemaType,
  HydratedDocument,
  HydratedDocumentFromSchema,
} from "mongoose";

export namespace ExtraTypings {
  export type HydratedShiftDocument = HydratedDocument<ShiftDocument, ShiftDocOverrides>;
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
    breakEnd(timestamp?: number): Promise<this>;

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

  export interface ShiftDocument {
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
    events: {
      /**
       * An array of breaks logged during the shift.
       * Each break is a tuple which has two values in the format: `[StartEpoch, EndEpoch]`
       * where `EndEpoch` is a falsey value by default (not finished break).
       */
      breaks: [number, number | 0 | null][];

      /** The number of arrests logged during this shift. */
      arrests: number;

      /** The number of citations logged during this shift. */
      citations: number;
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
  export interface UserPermissionsConfig {
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
