import { ExtraTypings } from "@Typings/Utilities/Database.js";
import { HydratedDocumentFromSchema, Schema } from "mongoose";

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

    set(this: ExtraTypings.HydratedShiftDocument["durations"]) {
      return this.on_duty;
    },

    get(this: ExtraTypings.HydratedShiftDocument["durations"]) {
      const ShiftDoc = this.ownerDocument() as ExtraTypings.HydratedShiftDocument;
      const EndTimestamp = ShiftDoc.end_timestamp?.valueOf() ?? Date.now();
      if (!ShiftDoc.start_timestamp) return 0;

      const TotalShiftDuration = EndTimestamp - ShiftDoc.start_timestamp.valueOf();
      let OnDutyDuration = TotalShiftDuration;
      OnDutyDuration -= this.on_break;
      OnDutyDuration += this.on_duty_mod;
      OnDutyDuration = Math.max(OnDutyDuration, 0);

      return OnDutyDuration;
    },
  },

  on_break: {
    type: Number,
    default: 0,
    min: 0,

    set(this: ExtraTypings.HydratedShiftDocument["durations"]) {
      return this.on_break;
    },

    get(this: ExtraTypings.HydratedShiftDocument["durations"]) {
      const ShiftDoc = this.ownerDocument() as ExtraTypings.HydratedShiftDocument;
      const EndTimestamp = ShiftDoc.end_timestamp?.valueOf() ?? Date.now();
      if (!ShiftDoc.start_timestamp) return 0;

      const TotalShiftDuration = EndTimestamp - ShiftDoc.start_timestamp.valueOf();
      let OnBreakDuration = 0;

      if (ShiftDoc.events.breaks.length) {
        for (const Break of ShiftDoc.events.breaks) {
          const [StartEpoch, EndEpoch] = Break;
          OnBreakDuration += Math.max((EndEpoch || EndTimestamp) - StartEpoch, 0);
        }

        OnBreakDuration = Math.min(OnBreakDuration, TotalShiftDuration);
        return OnBreakDuration;
      }

      this.on_break = OnBreakDuration;
      return OnBreakDuration;
    },
  },

  on_duty_mod: {
    type: Number,
    default: 0,
  },
});

ShiftDurations.set("versionKey", false);
ShiftDurations.remove("total");
ShiftDurations.virtual("total").get(function (
  this: HydratedDocumentFromSchema<typeof ShiftDurations>
) {
  return this.on_duty + this.on_duty_mod + this.on_break;
});

export default ShiftDurations;
