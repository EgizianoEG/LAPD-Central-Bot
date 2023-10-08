import { randomInt as RandomInteger } from "node:crypto";
import { Schema, model } from "mongoose";
import ShiftDurations from "./Schemas/ShiftDurations.js";

const ShiftSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => {
        const Timestamp = Date.now();
        const RanNumber = RandomInteger(10, 99);
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

    events: {
      _id: false,
      default: {},
      type: {
        breaks: [
          {
            _id: false,
            default: undefined,
            type: [Number, Number],
          },
        ],
        arrests: {
          type: Number,
          default: 0,
        },
        citations: {
          type: Number,
          default: 0,
        },
      },
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
        else this.end_timestamp = new Date(timestamp);

        const TotalShiftTime = this.end_timestamp.valueOf() - this.start_timestamp.valueOf();
        this.durations.on_duty = TotalShiftTime;

        if (this.events.breaks.length) {
          for (const Break of this.events.breaks) {
            if (!Break[1]) Break[1] = Date.now();
            // @ts-ignore
            const [StartEpoch, EndEpoch] = Break;
            this.durations.on_break += EndEpoch - StartEpoch;
          }
          this.durations.on_duty -= this.durations.on_break;
        }

        return this.save();
      },
    },
  }
);

ShiftSchema.set("_id", false);
ShiftSchema.set("versionKey", false);
ShiftSchema.post("find", (Shifts) => {
  Shifts.forEach((Shift) => {
    if (Shift.end_timestamp) return;
    const CurrTimestamp = Date.now();
    const TotalShiftDuration = CurrTimestamp - Shift.start_timestamp.valueOf();
    Shift.durations.on_duty = TotalShiftDuration;

    if (Shift.events.breaks.length) {
      for (const Break of Shift.events.breaks) {
        const [StartEpoch, EndEpoch] = Break;
        Shift.durations.on_break += (EndEpoch ?? CurrTimestamp) - StartEpoch;
      }
      Shift.durations.on_duty -= Shift.durations.on_break;
    }

    return Shift;
  });
  return Shifts;
});

export default model("Shift", ShiftSchema);
