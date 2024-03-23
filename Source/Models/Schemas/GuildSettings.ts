import { Schema } from "mongoose";
import ShiftTypeSchema from "./ShiftType.js";

const SnowflakeIDValidation: [RegExp, string] = [
  /^\d{15,22}$/,
  "Received an invalid snowflake Id; received '{VALUE}'.",
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

  // The interval in milliseconds that the application will delete logged data (citations and arrests)
  // if the current date minus the creation timestamp/date is greater than this value
  // Defaults to 0, which means that no data will be deleted
  // Can be one of: [0 days, 3 days, 7 days, 30 days]
  log_deletion_interval: {
    type: Number,
    default: 0,
    enum: [0, 86400000, 259200000, 604800000, 1209600000, 2592000000],
  },

  // The channel IDs for logging particular actions and data
  // (citations, arrests, and shift actions like starting a new shift)
  // For citations and arrests, the format must be in the following formats:
  // - [Joined guild Id]:[Available channel's Id In that guild] for outside channels;
  // - [Channel Id] for local channels (where the app is configured).
  // Which will allow the bot to log to multiple channels in different guilds (maximum of two).
  log_channels: {
    _id: false,
    default: {},
    type: {
      citations: {
        validate: [(arr: string[]) => arr.length <= 2, "Maximum of 2 channels allowed"],
        type: [
          {
            type: String,
            _id: false,
            default: null,
            required: false,
            match: [
              /^(?:\d{15,22}|\d{15,22}:\d{15,22})$/,
              "Invalid snowflake format. Received '{VALUE}'.",
            ],
          },
        ],
      },

      arrests: {
        validate: [(arr: string[]) => arr.length <= 2, "Maximum of 2 channels allowed"],
        type: [
          {
            type: String,
            _id: false,
            default: null,
            required: false,
            match: [
              /^(?:\d{15,22}|\d{15,22}:\d{15,22})$/,
              "Invalid snowflake format. Received '{VALUE}'.",
            ],
          },
        ],
      },

      shift_activities: {
        type: String,
        default: null,
        required: false,
        match: SnowflakeIDValidation,
      },

      loa_approvals: {
        type: String,
        default: null,
        required: false,
        match: SnowflakeIDValidation,
      },

      loa_logs: {
        type: String,
        default: null,
        required: false,
        match: SnowflakeIDValidation,
      },
    },
  },

  on_leave_role: {
    type: String,
    match: SnowflakeIDValidation,
    default: null,
    required: false,
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
