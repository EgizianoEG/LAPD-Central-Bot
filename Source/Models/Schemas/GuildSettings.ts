import ShiftTypeSchema from "./ShiftType.js";
import { Schema } from "mongoose";

const SnowflakeIDValidationN1: [RegExp, string] = [
  /^\d{15,22}$/,
  "Received an invalid snowflake Id; received '{VALUE}'.",
];

const SnowflakeIDValidationN2: [RegExp, string] = [
  /^\d{15,22}$|^\d{15,22}:\d{15,22}$/,
  "Received an invalid snowflake Id.",
];

const RolePermsValidator = {
  validator: (Arr: string[]) => Arr.every((id: string) => /^\d{15,22}$/.test(id)),
  message:
    "Invalid role Id found in the provided snowflake Id array; ensure that all roles are valid.",
};

/**
 * @see @Typings/Utilities/Database.js for schema documentation.
 */
const GuildSettings = new Schema({
  require_authorization: {
    type: Boolean,
    default: true,
    required: true,
  },

  utif_enabled: {
    type: Boolean,
    default: true,
    required: true,
  },

  role_perms: {
    _id: false,
    required: true,
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

  shift_management: {
    _id: false,
    default: {},
    required: true,
    type: {
      enabled: {
        type: Boolean,
        default: false,
        required: true,
      },

      shift_types: [ShiftTypeSchema],

      default_quota: {
        type: Number,
        required: true,
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
              match: SnowflakeIDValidationN1,
            },
          ],
          on_break: [
            {
              _id: false,
              type: String,
              match: SnowflakeIDValidationN1,
            },
          ],
        },
      },

      log_channel: {
        type: String,
        default: null,
        required: false,
        match: SnowflakeIDValidationN1,
      },
    },
  },

  duty_activities: {
    _id: false,
    default: {},
    required: true,
    type: {
      enabled: {
        type: Boolean,
        default: false,
        required: true,
      },

      log_deletion_interval: {
        type: Number,
        default: 0,
        required: true,
        enum: [0, 86400000, 259200000, 604800000, 1209600000, 2592000000],
      },

      log_channels: {
        _id: false,
        default: {},
        type: {
          citations: {
            validate: [(arr: string[]) => arr.length <= 2, "A maximum of 2 channels is allowed."],
            type: [
              {
                type: String,
                _id: false,
                match: SnowflakeIDValidationN2,
              },
            ],
          },

          arrests: {
            validate: [(arr: string[]) => arr.length <= 2, "A maximum of 2 channels is allowed."],
            type: [
              {
                type: String,
                _id: false,
                match: SnowflakeIDValidationN2,
              },
            ],
          },

          incidents: {
            type: String,
            default: null,
            required: false,
            match: SnowflakeIDValidationN1,
          },
        },
      },
    },
  },

  leave_notices: {
    _id: false,
    default: {},
    required: true,
    type: {
      enabled: {
        type: Boolean,
        default: false,
        required: true,
      },

      requests_channel: {
        type: String,
        default: null,
        required: false,
        match: SnowflakeIDValidationN1,
      },

      log_channel: {
        type: String,
        default: null,
        required: false,
        match: SnowflakeIDValidationN1,
      },

      leave_role: {
        type: String,
        default: null,
        required: false,
        match: SnowflakeIDValidationN1,
      },
    },
  },

  reduced_activity: {
    _id: false,
    default: {},
    required: true,
    type: {
      enabled: {
        type: Boolean,
        default: false,
        required: true,
      },

      requests_channel: {
        type: String,
        default: null,
        required: false,
        match: SnowflakeIDValidationN1,
      },

      log_channel: {
        type: String,
        default: null,
        required: false,
        match: SnowflakeIDValidationN1,
      },

      ra_role: {
        type: String,
        default: null,
        required: false,
        match: SnowflakeIDValidationN1,
      },
    },
  },
});

export default GuildSettings;
