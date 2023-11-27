import { PreDelete, ProfilePostFind } from "./Functions/ProfileModel.js";
import { Schema, model } from "mongoose";
import ShiftsDataSchema from "./Schemas/ShiftsData.js";

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
    index: true,
    required: true,
  },

  linked_account: {
    _id: false,
    default: {},
    type: {
      roblox_user_id: {
        min: 0,
        default: 0,
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

ProfileSchema.post(/^find/, ProfilePostFind);
ProfileSchema.pre("deleteOne", { query: false, document: true }, PreDelete);
ProfileSchema.pre(
  [
    "deleteOne",
    "deleteMany",
    "findOneAndDelete",
    "findOneAndRemove",
    "findByIdAndDelete",
    "findByIdAndRemove",
  ] as any,
  { query: true, document: false },
  PreDelete
);

export default model("GuildProfile", ProfileSchema, "profiles");
