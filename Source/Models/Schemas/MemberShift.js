const { Schema } = require("mongoose");
const { randomInt: RanInt } = require("node:crypto");
const DurationsSchema = require("./ShiftDurations");

const ShiftSchema = new Schema({
  id: {
    type: String,
    default: () => {
      const Timestamp = Date.now();
      const RanNumber = RanInt(10, 99);
      return `${Timestamp}${RanNumber}`.slice(0, 15);
    },
  },

  start_timestamp: {
    type: Date,
    default: Date.now,
  },

  end_timestamp: {
    type: Date,
    default: null,
    required: false,
  },

  type: {
    type: String,
    default: "Default",
  },

  // Durations are in milliseconds
  durations: {
    _id: false,
    default: {},
    type: DurationsSchema,
  },
});

module.exports = ShiftSchema;
