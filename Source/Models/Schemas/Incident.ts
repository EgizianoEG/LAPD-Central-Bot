import { GuildIncidents } from "@Typings/Utilities/Database.js";
import { Model, Schema } from "mongoose";
import IncidentTypes from "@Resources/IncidentTypes.js";

type IncidentPlainDoc = GuildIncidents.IncidentRecord;
type IncidentModelType = Model<IncidentPlainDoc, unknown>;

const ArrestSchema = new Schema<IncidentPlainDoc, IncidentModelType>({
  _id: {
    type: Number,
    required: true,
  },

  type: {
    type: String,
    required: true,
    enum: IncidentTypes,
  },

  made_on: {
    type: Date,
    required: true,
    default: Date.now,
  },

  location: {
    type: String,
    required: true,
    minlength: 4,
    maxlength: 80,
  },

  suspects: {
    required: true,
    default: [],
    type: [
      {
        _id: false,
        type: String,
      },
    ],
  },

  victims: {
    required: true,
    default: [],
    type: [
      {
        _id: false,
        type: String,
      },
    ],
  },

  officers: {
    required: true,
    default: [],
    type: [
      {
        _id: false,
        type: String,
      },
    ],
  },

  reported_by: {
    required: true,
    _id: false,
    type: {
      id: Number,
      username: String,
      display_name: String,
      discord_id: String,
    },
  },

  notes: {
    type: String,
    default: null,
    required: false,
    minlength: 8,
    maxlength: 100,
    trim: true,
  },

  status: {
    type: String,
    required: true,
    default: "Active",
    enum: ["Active", "Resolved", "Closed"],
  },

  attachments: {
    required: true,
    default: [],
    type: [
      {
        _id: false,
        type: String,
      },
    ],
  },

  description: {
    type: String,
    required: true,
    minlength: 20,
    maxlength: 850,
    trim: true,
  },
});

export default ArrestSchema;
