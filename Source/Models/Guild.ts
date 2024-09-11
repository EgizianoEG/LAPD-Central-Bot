import { Schema, model } from "mongoose";
import { isAfter } from "date-fns";
import ArrestSchema from "./Schemas/Arrest.js";
import CitationSchema from "./Schemas/Citation.js";
import IncidentSchema from "./Schemas/Incident.js";
import GSettingsSchema from "./Schemas/GuildSettings.js";

const GuildSchema = new Schema({
  _id: {
    type: String,
    required: true,
    match: /^\d{15,22}$/,
  },

  logs: {
    _id: false,
    default: {},
    type: {
      arrests: [ArrestSchema],
      citations: [CitationSchema],
      incidents: [IncidentSchema],
    },
  },

  settings: {
    _id: false,
    default: {},
    type: GSettingsSchema,
  },

  deletion_scheduled_on: {
    type: Date,
    default: null,
    validate: [
      (d: Date) => d === null || isAfter(d, Date.now()),
      "The deletion date, if set, must be in the future; otherwise, it must be null. Value received: {VALUE}.",
    ],
  },
});

GuildSchema.set("_id", false);
GuildSchema.set("optimisticConcurrency", true);

export default model("Guild", GuildSchema);
