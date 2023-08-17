const { Schema, model } = require("mongoose");
const MemberSchema = require("./Schemas/GuildMember");
const CallsignSchema = require("./Schemas/Callsign");
const CiationSchema = require("./Schemas/Citation");
const ArrestSchema = require("./Schemas/Arrest");

const SnowflakeID_Validation = [
  /^\d{15,22}$/,
  "Invalid role ID; ensure it is a valid Snowflake ID.",
];

const RPerms_Validator = {
  validator: (Arr) => Arr.every((id) => /^\d{15,22}$/.test(id)),
  message:
    "Invalid role ID found in the provided array; ensure that all roles are valid Snowflake IDs",
};

const GuildSchema = new Schema({
  id: {
    type: String,
    required: true,
    match: SnowflakeID_Validation,
  },

  settings: {
    // Restricts usage of certain commands in a server to the user who verified using the application
    login_restrictions: {
      type: Boolean,
      default: true,
    },

    // Logged guild scoped data
    logs: {
      citations: [CiationSchema],
      arrests: [ArrestSchema],
      callsigns: [CallsignSchema],
    },

    // The channel IDs of which to log specific actions and data
    logging_channels: {
      citations: {
        type: String,
        default: null,
        required: false,
        match: SnowflakeID_Validation,
      },
      arrests: {
        type: String,
        default: null,
        required: false,
        match: SnowflakeID_Validation,
      },
      shift_actions: {
        type: String,
        default: null,
        required: false,
        match: SnowflakeID_Validation,
      },
    },

    // Role permissions which will be used to restrict the usage of certain commands and actions
    role_permissions: {
      staff: {
        type: [String],
        required: false,
        validate: RPerms_Validator,
      },
      management: {
        type: [String],
        required: false,
        validate: RPerms_Validator,
      },
    },

    /*
    Shift Related Settings:
      role_assignment -> Role assignments based on the active shift status of a member (on break/on duty)
        | on_duty  -> The role ID given to a user with an on-duty shift status
        | on_break -> The role ID given to a user with an on-break shift status

      shift_quota  -> The required duration of time (in milliseconds) for each member to be on-shift; defaults: 0 seconds
      shift_max_duration -> The maximum shift duration (in milliseconds); defaults to one day; minimum: 15 minutes
    */
    shift_settings: {
      role_assignment: {
        on_duty: {
          type: String,
          default: null,
          required: false,
          match: SnowflakeID_Validation,
        },
        on_break: {
          type: String,
          default: null,
          required: false,
          match: SnowflakeID_Validation,
        },
      },

      shift_quota: {
        type: Number,
        default: 0,
        min: 0,
      },

      shift_types: {
        type: [String],
      },

      shift_max_duration: {
        type: Number,
        default: 86_400_000,
        min: 900000,
      },
    },
  },

  // Guild members array which will include members who have verified before in the application
  members: {
    type: [MemberSchema],
    default: [],
  },
});

module.exports = model("Guild", GuildSchema);
