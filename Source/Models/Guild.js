const { Schema, model } = require("mongoose");
const CallsignSchema = require("./Schemas/Callsign");
const CiationSchema = require("./Schemas/Citation");
const ArrestSchema = require("./Schemas/Arrest");
const GSettingsSchema = require("./Schemas/GuildSettings");

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
      citations: [CiationSchema],
      callsigns: [CallsignSchema],
    },
  },

  settings: {
    _id: false,
    default: {},
    type: GSettingsSchema,
  },

  // Members who have interacted with particular application commands are included in the
  // guild members array, which is an array of object Ids that refer to member profiles.
  members: {
    type: [
      {
        type: Schema.Types.ObjectId,
        ref: "GuildProfile",
      },
    ],
  },
});

GuildSchema.set("_id", false);
GuildSchema.set("versionKey", false);

module.exports = model("Guild", GuildSchema);
