const { Schema } = require("mongoose");
const ShiftSchema = require("./MemberShift");
const DurationsSchema = require("./ShiftDurations");

const MemberSchema = new Schema({
  user_id: {
    type: String,
    required: true,
    match: /^\d{15,22}$/,
  },

  // The roblox user of which guild member has verified with
  linked_account: {
    roblox_user_id: {
      type: Number,
      default: null,
    },
  },

  shifts: {
    // The average shift times, including total, on-break, and on-duty durations
    average_periods: {
      _id: false,
      default: {},
      type: DurationsSchema,
    },

    // The total durations recorded in the shift logs
    total_durations: {
      _id: false,
      default: {},
      type: DurationsSchema,
    },

    // An array containing all shifts that have been logged
    logs: [ShiftSchema], // TODO: Consider referring to a model
  },
});

module.exports = MemberSchema;
