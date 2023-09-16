const { Schema, model } = require("mongoose");
const ShiftsDataSchema = require("./Schemas/ShiftsData");

const ProfileSchema = new Schema({
  _id: {
    type: String,
    match: /^\d{15,22}$/,
    required: true,
  },

  guild: {
    type: String,
    ref: "Guild",
    match: /^\d{15,22}$/,
    required: true,
  },

  linked_account: {
    _id: false,
    default: {},
    type: {
      roblox_user_id: {
        min: 0,
        default: 0,
        required: true,
        type: Number,
      },
    },
  },

  shifts: {
    _id: false,
    default: {},
    type: ShiftsDataSchema,
  },
});

ProfileSchema.set("_id", false);
ProfileSchema.set("versionKey", false);

module.exports = model("GuildProfile", ProfileSchema, "profiles");
