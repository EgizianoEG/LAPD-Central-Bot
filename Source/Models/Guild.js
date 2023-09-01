const { Schema, model } = require("mongoose");
const MemberSchema = require("./Schemas/GuildMember");
const CallsignSchema = require("./Schemas/Callsign");
const CiationSchema = require("./Schemas/Citation");
const ArrestSchema = require("./Schemas/Arrest");
const ShiftTypeSchema = require("./Schemas/ShiftType");

/** @type {[RegExp, string]} */
const SnowflakeID_Validation = [
  /^\d{15,22}$/,
  "Invalid ID privided; ensure it is a valid Snowflake ID.",
];

const RPerms_Validator = {
  validator: (Arr) => Arr.every((id) => /^\d{15,22}$/.test(id)),
  message:
    "Invalid role ID found in the provided array; ensure that all roles are valid Snowflake IDs",
};

const GuildSchema = new Schema({
  _id: {
    type: String,
    required: true,
    match: SnowflakeID_Validation,
  },

  // Logged guild scoped data
  logs: {
    arrests: [ArrestSchema],
    citations: [CiationSchema],
    callsigns: [CallsignSchema],
  },

  settings: {
    // Restricts usage of certain commands in a server to the user who verified using the application
    require_authorization: {
      type: Boolean,
      default: true,
    },

    // The channel IDs of which to log specific actions and data
    log_channels: {
      citations: {
        type: String,
        default: null,
        match: SnowflakeID_Validation,
      },
      arrests: {
        type: String,
        default: null,
        match: SnowflakeID_Validation,
      },
      shift_activities: {
        type: String,
        default: null,
        match: SnowflakeID_Validation,
      },
    },

    // Role permissions which will be used to restrict the usage of certain commands and actions
    // Staff are the ones allowed to utilize low-profile shift management commands and actions (all members if not specified by default)
    role_perms: {
      staff: {
        type: [String],
        validate: RPerms_Validator,
      },
      management: {
        type: [String],
        validate: RPerms_Validator,
      },
    },

    /*
    Shift Related Settings:
      role_assignment -> Role assignments based on the active shift status of a member (on break/on duty)
        | on_duty  -> The role ID given to a user with an on-duty shift status
        | on_break -> The role ID given to a user with an on-break shift status

      shift_types  -> An array of shift type objects that contain the name (name) of the shift and roles (permissible_roles) of which holders can use this type
      shift_quota  -> The required duration of time (in milliseconds) for each member to be on-shift; defaults: 0 seconds
      shift_max_duration -> The maximum shift duration (in milliseconds); defaults to one day; minimum: 15 minutes
    */
    shifts: {
      role_assignment: {
        on_duty: {
          type: String,
          default: null,
          match: SnowflakeID_Validation,
        },
        on_break: {
          type: String,
          default: null,
          match: SnowflakeID_Validation,
        },
      },

      weekly_quota: {
        type: Number,
        default: 0,
        min: 0,
      },

      types: {
        type: [ShiftTypeSchema],
      },

      max_shift_duration: {
        type: Number,
        default: 86_400_000,
        min: 900_000,
      },
    },
  },

  // Guild members array which will include members who have verified before in the application
  members: {
    type: [MemberSchema],
  },
});

GuildSchema.set("_id", false);
GuildSchema.set("strict", true);
GuildSchema.set("versionKey", false);

module.exports = model("Guild", GuildSchema);
