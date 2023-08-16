const { Schema } = require("mongoose");
const { randomInt: RanInt } = require("node:crypto");

const ShiftSchema = new Schema({
  shift_id: {
    type: String,
    default: () => {
      const Timestamp = new Date().getTime();
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

  shift_type: {
    type: String,
    default: "Default",
  },

  // Durations are in milliseconds
  durations: {
    total: {
      type: Number,
      default: 0,
    },
    on_duty: {
      type: Number,
      default: 0,
    },
    on_break: {
      type: Number,
      default: 0,
    },
  },
});

module.exports = ShiftSchema;
