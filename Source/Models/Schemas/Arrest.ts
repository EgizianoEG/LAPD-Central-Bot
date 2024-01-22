import ERLCAgeGroups from "@Resources/ERLCAgeGroups.js";
import { Schema } from "mongoose";

const ArrestSchema = new Schema({
  // Used as the booking number
  _id: {
    type: String,
    required: true,
  },

  // Last known name (to use as a fallback when getting the username from id fails)
  arrestee_formatted_name: {
    type: String,
    trim: true,
    required: true,
  },

  arrestee_roblox_id: {
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
    enum: ["Male", "Female"],
  },

  height: {
    type: String,
    trim: true,
    required: true,
  },

  weight: {
    type: String,
    trim: true,
    required: true,
  },

  age_group: {
    type: String,
    required: true,
    enum: ERLCAgeGroups.map((AgeGroup) => AgeGroup.name),
  },

  charges: {
    type: String,
    trim: true,
    required: true,
    minLength: 6,
    maxLength: 1028,
  },

  arresting_officer_roblox_id: {
    type: Number,
    required: true,
  },

  arresting_officer_discord_id: {
    type: String,
    required: true,
  },

  // Last known name (to use as a fallback when getting the username from id fails).
  arresting_officer_formatted_name: {
    type: String,
    required: true,
  },

  /** Arresting officers who assisted with the arrest (Array of Discord user Ids) */
  arrest_assisting_officers: {
    type: [String],
    default: [],
    required: true,
  },

  // The date when the arrest report was created.
  made_at: {
    type: Date,
    required: true,
  },
});

export default ArrestSchema;
