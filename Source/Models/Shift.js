const { Schema, model } = require("mongoose");
const { randomInt: RandomInt } = require("crypto");
const ShiftDurations = require("./Schemas/ShiftDurations");

const ShiftSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => {
        const Timestamp = Date.now();
        const RanNumber = RandomInt(10, 99);
        return `${Timestamp}${RanNumber}`.slice(0, 15);
      },
    },

    user: {
      type: String,
      ref: "GuildProfile",
      match: /^\d{15,22}$/,
      index: true,
      required: true,
    },

    guild: {
      type: String,
      ref: "Guild",
      match: /^\d{15,22}$/,
      index: true,
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

    durations: {
      _id: false,
      default: {},
      type: ShiftDurations,
    },
  },
  {
    methods: {
      /**
       * Ends the shift if it is still active and returns a promise resolves to the saved shift
       * @param {Date | Number} [timestamp=new Date()] The shift end timestamp to set as a Date object or as a timestamp in milliseconds; defaults to the timestamp when the function was invoked.
       */
      end(timestamp = new Date()) {
        if (this.end_timestamp) return this;
        timestamp = new Date(timestamp);
        this.end_timestamp = timestamp;
        return this.save();
      },
    },
  }
);

ShiftSchema.set("versionKey", false);
ShiftSchema.set("_id", false);

module.exports = model("Shift", ShiftSchema);
