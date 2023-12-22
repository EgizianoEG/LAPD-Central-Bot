import { Schema } from "mongoose";
import ShiftTypeSchema from "./ShiftType.js";

const SnowflakeIDValidation: [RegExp, string] = [
  /^\d{15,22}$/,
  "Received an invalid snowflake Id provided; received '{VALUE}'.",
];

const RolePermsValidator = {
  validator: (Arr: string[]) => Arr.every((id: string) => /^\d{15,22}$/.test(id)),
  message:
    "Invalid role Id found in the provided snowflake Id array; ensure that all roles are valid",
};

const GuildSettings = new Schema({
  // If enabled, restricts usage of certain commands in a server to users
  // who have logged into and verified with the application
  require_authorization: {
    type: Boolean,
    default: true,
    required: true,
  },

  // The channel IDs for logging particular actions and data
  // (citations, arrests, and shift actions like starting a new shift)
  log_channels: {
    _id: false,
    default: {},
    type: {
      citations: {
        type: String,
        default: null,
        required: false,
        match: SnowflakeIDValidation,
      },
      arrests: {
        type: String,
        default: null,
        required: false,
        match: SnowflakeIDValidation,
      },
      shift_activities: {
        type: String,
        default: null,
        required: false,
        match: SnowflakeIDValidation,
      },
    },
  },

  // Role permissions that are going to be used to limit the use of specific commands and operations
  // Staff (all members if not designated by default) are the only ones authorized to use low-profile shift management commands and activities.
  // Management are all members allowed to utilize high-profile shift management commands and actions like wiping data and removing shifts from members
  role_perms: {
    _id: false,
    default: {},
    type: {
      staff: {
        type: [String],
        validate: RolePermsValidator,
      },
      management: {
        type: [String],
        validate: RolePermsValidator,
      },
    },
  },

  /*
    Shift Related Settings:
      role_assignment    -> Role assignments are based on a member's active shift state (on break/on duty) 
        | on_duty        -> The role ID assigned to a user with the state "on-duty"
        | on_break       -> The role ID assigned to a user with the state "on-break"

      types              -> An array of shift type objects that include the name, id, default state, and permissible roles of the shift type
      weekly_quota       -> The minimum amount of time that each member has to be on shift for (in milliseconds); defaults to 0 seconds
      durations          -> 
    */
  shifts: {
    _id: false,
    default: {},
    type: {
      types: [ShiftTypeSchema],

      weekly_quota: {
        type: Number,
        default: 0,
        min: 0,
      },

      role_assignment: {
        _id: false,
        default: {},
        type: {
          on_duty: [
            {
              _id: false,
              type: String,
              match: SnowflakeIDValidation,
            },
          ],
          on_break: [
            {
              _id: false,
              type: String,
              match: SnowflakeIDValidation,
            },
          ],
        },
      },

      durations: {
        _id: false,
        default: {},
        type: {
          total_max: {
            type: Number,
            default: 0,
          },
          on_break_max: {
            type: Number,
            default: 0,
          },
        },
      },
    },
  },
});

GuildSettings.set("versionKey", false);
export default GuildSettings;
