import { PreDelete, ProfilePostFind, FindOneOrCreate } from "./Functions/ProfileModel.js";
import { Schema, model } from "mongoose";
import { GuildProfiles } from "@Typings/Utilities/Database.js";
import ShiftsDataSchema from "./Schemas/ShiftsData.js";

const ProfileSchema = new Schema<
  GuildProfiles.ProfileDocument,
  GuildProfiles.ProfileModelType,
  GuildProfiles.ProfileOverrides
>({
  user: {
    type: String,
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

  linked_account: {
    _id: false,
    default: {},
    required: true,
    type: {
      roblox_user_id: {
        min: 0,
        default: 0,
        type: Number,
      },
    },
  },

  loas: {
    required: true,
    default: [],
    type: [
      {
        type: String,
        match: /^\d{15,22}$/,
        ref: "LeaveOfAbsence",
      },
    ],
  },

  shifts: {
    _id: false,
    default: {},
    required: true,
    type: ShiftsDataSchema,
  },
});

ProfileSchema.static("findOneOrCreate", FindOneOrCreate);
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

export default model<GuildProfiles.ProfileDocument, GuildProfiles.ProfileModelType>(
  "GuildProfile",
  ProfileSchema,
  "profiles"
);
