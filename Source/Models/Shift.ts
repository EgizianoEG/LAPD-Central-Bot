import ShiftInstFuncs, {
  PreShiftModelDelete,
  PreShiftDocDelete,
  StartNewShift,
} from "./Functions/ShiftModel.js";

import { Shifts } from "@Typings/Utilities/Database.js";
import { Schema, model } from "mongoose";
import { randomInt as RandomInteger } from "node:crypto";
import ShiftDurations from "./Schemas/ShiftDurations.js";
import DHumanize from "humanize-duration";

const HumanizeDuration = DHumanize.humanizer({
  conjunction: " and ",
  largest: 3,
  round: true,
});

const ShiftSchema = new Schema<
  Shifts.ShiftDocument,
  Shifts.ShiftModel,
  Shifts.ShiftDocumentOverrides
>({
  _id: {
    type: String,
    default() {
      return `${Date.now()}${RandomInteger(10, 99)}`.slice(0, 15);
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
    immutable: true,
  },

  end_timestamp: {
    type: Date,
    index: true,
    default: null,
    required: false,
  },

  type: {
    type: String,
    trim: true,
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
      breaks: [[Number, Number]],
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
});

ShiftSchema.set("_id", false);
ShiftSchema.set("optimisticConcurrency", true);
ShiftSchema.statics.startNewShift = StartNewShift;

ShiftSchema.virtual("on_duty_time").get(function () {
  return HumanizeDuration(this.durations.on_duty);
});

ShiftSchema.virtual("on_break_time").get(function () {
  return HumanizeDuration(this.durations.on_break);
});

ShiftSchema.pre("deleteOne", { query: false, document: true }, function (next) {
  return PreShiftDocDelete.call(this, next);
});

ShiftSchema.pre("deleteOne", { query: true, document: false }, function (next) {
  return PreShiftModelDelete.call(this, "one", next);
});

ShiftSchema.pre("deleteMany", function (next) {
  return PreShiftModelDelete.call(this, "many", next);
});

ShiftSchema.pre("save", function (next) {
  // Make sure that durations are calculated and set before saving.
  // Otherwise, they will be saved as `0`.
  this.durations.on_duty = -1;
  this.durations.on_break = -1;
  next();
});

for (const [MethodName, MethodFunc] of Object.entries(ShiftInstFuncs)) {
  ShiftSchema.method(MethodName, MethodFunc);
}

export default model<Shifts.ShiftDocument, Shifts.ShiftModel>("Shift", ShiftSchema);
