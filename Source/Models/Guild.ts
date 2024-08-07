import { Schema, model } from "mongoose";
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

  // Members who have interacted with particular application commands are included in the
  // guild members array, which is an array of object Ids that refer to member profiles.
  // Currently unused due to the usage of the GuildProfile model.
  members: {
    type: [
      {
        type: String,
        match: /^\d{15,22}$/,
        ref: "GuildProfile",
      },
    ],
  },
});

GuildSchema.set("_id", false);
GuildSchema.set("versionKey", false);

export default model("Guild", GuildSchema);
