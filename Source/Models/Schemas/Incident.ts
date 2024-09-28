import { GuildIncidents } from "@Typings/Utilities/Database.js";
import { Model, Schema } from "mongoose";
import {
  IncidentTypes,
  IncidentNotesLength,
  IncidentStatusesFlattened,
  IncidentDescriptionLength,
} from "@Resources/IncidentConstants.js";

type IncidentPlainDoc = GuildIncidents.IncidentRecord;
type IncidentModelType = Model<IncidentPlainDoc, unknown>;

const IncidentReportSchema = new Schema<IncidentPlainDoc, IncidentModelType>({
  _id: {
    type: Number,
    required: true,
  },

  type: {
    type: String,
    required: true,
    enum: IncidentTypes,
  },

  log_message: {
    type: String,
    default: null,
    required: false,
    match: /^\d{15,22}$/,
  },

  reported_on: {
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
        trim: true,
      },
    ],
  },

  witnesses: {
    required: true,
    default: [],
    type: [
      {
        _id: false,
        type: String,
        trim: true,
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
        trim: true,
      },
    ],
  },

  reported_by: {
    required: true,
    _id: false,
    type: {
      roblox_id: Number,
      roblox_username: String,
      discord_id: String,
      display_name: String,
    },
  },

  notes: {
    type: String,
    default: null,
    required: false,
    minlength: IncidentNotesLength.Min,
    maxlength: IncidentNotesLength.Max,
  },

  status: {
    type: String,
    required: true,
    default: "Active",
    enum: IncidentStatusesFlattened,
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
    minlength: IncidentDescriptionLength.Min,
    maxlength: IncidentDescriptionLength.Max,
    trim: true,
  },

  last_updated: {
    type: Date,
    required: true,
    default() {
      return this.reported_on || Date.now();
    },
  },

  last_updated_by: {
    _id: false,
    required: false,
    default: null,
    type: {
      discord_id: {
        type: String,
        required: true,
        match: /^\d{15,22}$/,
      },

      discord_username: {
        type: String,
        required: true,
        minlength: 2,
        maxlength: 32,
      },
    },
  },
});

export default IncidentReportSchema;
