const { Schema } = require("mongoose");
const ShiftDurations = require("./ShiftDurations");

const ShiftsData = new Schema({
  average_periods: {
    _id: false,
    default: {},
    type: ShiftDurations,
  },

  total_durations: {
    _id: false,
    default: {},
    type: ShiftDurations,
  },

  logs: [
    {
      type: Schema.ObjectId,
      ref: "Shift",
    },
  ],
});

module.exports = ShiftsData;
