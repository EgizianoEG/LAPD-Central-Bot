const { Schema } = require("mongoose");

const ShiftDurations = new Schema({
  total: {
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
});

ShiftDurations.set("versionKey", false);
ShiftDurations.remove("total");
ShiftDurations.virtual("total").get(function () {
  return this.on_duty + this.on_break;
});

module.exports = ShiftDurations;
