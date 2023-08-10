const { Schema, Types } = require("mongoose");
const ShiftSchema = require("./MemberShift");

const SnowflakeID_Validation = [
  /^\d{15,22}$/,
  "Invalid role ID; ensure it is a valid Snowflake ID.",
];

const MemberSchema = new Schema({
  user_id: {
    type: String,
    required: true,
    match: SnowflakeID_Validation,
  },

  // The roblox user of which guild member has verified with
  linked_user: {
    roblox_user_id: {
      type: Number,
      default: null,
    },
  },

  shifts: {
    // The average shift times, including total, on-break, and on-duty durations
    average_times: {
      all: {
        type: Number,
        default: 0,
        min: 0,
      },
      on_duty: {
        type: Number,
        default: 0,
        min: 0,
      },
      on_break: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // The total durations recorded in the shift logs
    total_durations: {
      all: {
        type: Number,
        default: 0,
        min: 0,
      },
      on_duty: {
        type: Number,
        default: 0,
        min: 0,
      },
      on_break: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // An array containing all shifts that have been logged
    logs: [ShiftSchema],
  },
});

module.exports = MemberSchema;
