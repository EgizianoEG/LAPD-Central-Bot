import type { Schema } from "mongoose";

declare global {
  namespace Utilities.Database {
    interface GuildSchema {
      /** A unique object identifier for mongodb */
      _id: Schema.Types.ObjectId;

      /** The unique snowflake guild Id */
      id: string;

      /** Guild-scope logged data */
      logs: {
        arrests: any[]; // Define ArrestSchema type if available
        citations: any[]; // Define CitationSchema type if available
        callsigns: any[]; // Define CallsignSchema type if available
      };

      /** Guild settings */
      settings: GuilSchemaInterfaces.GuildSettings;

      /** Application identified and known members in the guild */
      members: Member[];
    }

    interface GuildShiftType {
      /** The unique shift type name */
      name: string;

      /** Is this the default shift type? */
      is_default: boolean;

      /** All roles that can utilize this specific duty shift type */
      permissible_roles: string[];
    }
  }
}

namespace GuilSchemaInterfaces {
  interface GuildSettings {
    /** A boolean indication whether the guild has limitations on command usage and execution for non-verified users */
    login_restrictions: boolean;

    /** The channel IDs of which to log specific actions and data on */
    logging_channels: LoggingChannels;

    /**
     * Role permissions which are being used to restrict the usage of certain commands and actions.
     * Staff are the ones allowed to utilize low-profile shift management commands and actions (all members if not specified by default)
     */
    role_permissions: {
      staff: string[];
      management: string[];
    };

    /** All related shift configurations */
    shift_settings: ShiftSettings;
  }

  interface RoleAssignment {
    /** The role ID given to a user with an on-duty shift status */
    on_duty: string;

    /** The role ID given to a user with an on-break shift status */
    on_break: string;
  }

  interface ShiftSettings {
    /** The required weekly duration of time (in milliseconds) for each member to be on-shift; defaults: 0 seconds */
    shift_quota: number;

    /** An arrray of server-created duty shift types */
    shift_types: GuildShiftType[];

    /** The maximum shift duration (in milliseconds); defaults to one day; minimum: 15 minutes */
    shift_max_duration: number;

    /** Role assignments based on the active shift status of a member (on break/on duty) */
    role_assignment: RoleAssignment;
  }

  interface LoggingChannels {
    arrests: string;
    citations: string;
    shift_actions: string;
  }
}
