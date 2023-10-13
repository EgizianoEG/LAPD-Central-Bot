import { Schema } from "mongoose";
import ShiftDurations from "./ShiftDurations.js";

const ShiftDataSchema = new Schema({
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
      type: String,
      ref: "Shift",
    },
  ],
});

export default ShiftDataSchema;
