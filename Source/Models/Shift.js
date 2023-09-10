const { Schema, model } = require("mongoose");
const { randomInt: RanInt } = require("crypto");
const ShiftDurations = require("./Schemas/ShiftDurations");

const ShiftSchema = new Schema({
  _id: {
    type: String,
    default: () => {
      const Timestamp = Date.now();
      const RanNumber = RanInt(10, 99);
      return `${Timestamp}${RanNumber}`.slice(0, 15);
    },
  },

  user: {
    type: Schema.Types.ObjectId,
    ref: "GuildProfile",
    required: true,
  },

  guild: {
    type: String,
    ref: "Guild",
    required: true,
  },

  start_timestamp: {
    type: Date,
    default: Date.now,
  },

  end_timestamp: {
    type: Date,
    default: null,
  },

  type: {
    type: String,
    default: "Default",
  },

  // Durations are in milliseconds
  durations: {
    _id: false,
    default: {},
    type: ShiftDurations,
  },
});

ShiftSchema.set("versionKey", false);
ShiftSchema.set("_id", false);

module.exports = model("Shift", ShiftSchema);
