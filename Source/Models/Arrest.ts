import ERLCAgeGroups from "@Resources/ERLCAgeGroups.js";
import { GuildArrests } from "@Typings/Utilities/Database.js";
import { model, Model, Schema } from "mongoose";

type ArrestPlainDoc = GuildArrests.ArrestRecord;
type ArrestModelType = Model<ArrestPlainDoc, unknown>;

const ArrestSchema = new Schema<ArrestPlainDoc, ArrestModelType>({
  booking_num: {
    type: Number,
    required: true,
    unique: true,
  },

  guild: {
    type: String,
    required: true,
    match: /^\d{15,22}$/,
    ref: "Guild",
  },

  assisting_officers: {
    type: [String],
    default: [],
    required: true,
  },

  made_on: {
    type: Date,
    required: true,
    default: Date.now,
  },

  notes: {
    type: String,
    default: null,
    required: false,
  },

  arrestee: {
    _id: false,
    required: true,
    type: {
      formatted_name: {
        type: String,
        trim: true,
        required: true,
      },

      roblox_id: {
        type: Number,
        min: 0,
        required: true,
      },

      mugshot_url: {
        type: String,
        required: true,
      },

      gender: {
        type: String,
        trim: true,
        required: true,
        enum: ["Male", "Female", "M", "F"],
      },

      height: {
        type: String,
        trim: true,
        required: true,
      },

      weight: {
        type: Number,
        trim: true,
        required: true,
      },

      age_group: {
        type: String,
        required: true,
        enum: ERLCAgeGroups.map((AgeGroup) => AgeGroup.name),
      },

      charges: {
        required: true,
        type: [
          {
            _id: false,
            type: String,
            trim: true,
            required: true,
            minLength: 6,
            maxLength: 1028,
          },
        ],
      },
    },
  },

  arresting_officer: {
    _id: false,
    required: true,
    type: {
      roblox_id: {
        type: Number,
        required: true,
      },

      // Last known name (to use as a fallback when getting the username from id fails).
      formatted_name: {
        type: String,
        required: true,
      },

      discord_id: {
        type: String,
        required: true,
      },
    },
  },
});

ArrestSchema.set("optimisticConcurrency", true);
export default model<ArrestPlainDoc, ArrestModelType>("Arrest", ArrestSchema);
