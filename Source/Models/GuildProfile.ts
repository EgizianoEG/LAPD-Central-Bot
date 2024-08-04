import { PreDelete, ProfilePostFind } from "./Functions/ProfileModel.js";
import { Model, Schema, model } from "mongoose";
import { GuildProfiles } from "@Typings/Utilities/Database.js";
import ShiftsDataSchema from "./Schemas/ShiftsData.js";
import LOARecordSchema from "./Schemas/LeaveOfAbsence.js";

type ProfilePlainDoc = GuildProfiles.ProfileDocument;
type ProfileModelType = Model<ProfilePlainDoc, unknown, GuildProfiles.ProfileOverrides>;

const ProfileSchema = new Schema<ProfilePlainDoc, ProfileModelType, GuildProfiles.ProfileOverrides>(
  {
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
      type: {
        roblox_user_id: {
          min: 0,
          default: 0,
          type: Number,
        },
      },
    },

    loas: {
      type: [LOARecordSchema],
      default: [],
      required: true,
    },

    shifts: {
      _id: false,
      default: {},
      type: ShiftsDataSchema,
    },
  }
);

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

export default model<ProfilePlainDoc, ProfileModelType>("GuildProfile", ProfileSchema, "profiles");
