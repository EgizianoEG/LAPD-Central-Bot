import { Falsey } from "utility-types";
import type {
  Types,
  Schema,
  Document,
  InferSchemaType,
  HydratedDocument,
  HydratedDocumentFromSchema,
} from "mongoose";

type ShiftDurations = {
  /** The total duration (on-duty and on-break sum) for the shift in milliseconds */
  total: number;
  /** On-duty shift duration in milliseconds */
  on_duty: number;
  /** On-break shift duration in milliseconds */
  on_break: number;
};

type ShiftDocOverrides = {
  durations: Types.Subdocument<undefined> & ShiftDurations;

  /**
   * Ends the shift if it is still active and returns a promise resolves to the saved shift
   * @param {Date | Number} [timestamp=new Date()] The shift end timestamp to set as a Date object or as a timestamp in milliseconds; defaults to the timestamp when the function was invoked.
   */
  end(
    timestamp?: number | Date
  ): Promise<HydratedDocument<Utilities.Database.ShiftDocument, ShiftDocOverrides>>;
};

interface LogicalOperations {
  $and: boolean;
  $or: boolean;
  $not: boolean;
  $nor: boolean;
}

declare global {
  namespace Utilities.Database {
    type ShiftActiveFunc = <UOType extends boolean | undefined = false>({
      Interaction,
      ShiftType,
      UserOnly = false,
    }: {
      /** Whether or not to return the active shift for the individual who initiated the interaction only. */
      UserOnly?: UOType;
      /** The types of duty shifts that will be retrieved; e.g. `"Default"`, `["Default", "Night Shift"]` */
      ShiftType?: string | string[];
      /** The received discord.js guild interaction */
      Interaction: SlashCommandInteraction<"cached">;
    }) => Promise<
      UOType extends Falsey
        ? HydratedDocument<ShiftDocument, ShiftDocOverrides>[]
        : HydratedDocument<ShiftDocument, ShiftDocOverrides> | null
    >;

    type HydratedShiftDocument = HydratedDocument<ShiftDocument, ShiftDocOverrides>;

    interface ShiftDocument {
      /** The unique identifier (15 digits) of this shift
       * where the first 13 digits indicates the timestamp
       * of this shift and the last 2 are randomly generated digits
       */
      _id: string;
      /** The user who initiated this shift */
      user: string;
      /** The guild this shift belongs to */
      guild: string;
      /** The start timestamp of the shift (i.e. the time when this shift was created) */
      start_timestamp: Date;
      /** End timestamp of this shift; defaults to `null` which indicates that this shift is currently active */
      end_timestamp: Date | null;
      /** The shift type */
      type: string;
      durations: ShiftDurations;
      events: {
        /** An array of breaks logged during the shift. Every break has two values in the format: `[StartEpoch, EndEpoch]` */
        breaks: [[number, number | null]];
        arrests: number;
        citations: number;
      };
    }

    interface GuildShiftType {
      /** The unique shift type name */
      name: string;
      /** Should this shift type be the default one? */
      is_default: boolean;
      /** All roles whose holders can utilize this duty shift type */
      permissible_roles: string[];
      /** The date when this shift type was created */
      created_at: Date;
    }

    /** Bot (application) or guild management/staff permissions.
     * If a boolean value given to a parent property, it acts like logical OR
     * meaning that if the object is `{ management: true }`; then the check will succeed
     * if the user has one of the permissions for management (guild scope or app scope); otherwise it will fail.
     */
    interface UserPermissionsData {
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
}
