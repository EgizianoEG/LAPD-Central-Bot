import { Schema, mongo } from "mongoose";

const ShiftTypeSchema = new Schema({
  _id: {
    required: true,
    type: Schema.Types.ObjectId,
    default: () => new mongo.ObjectId(),
  },

  name: {
    type: String,
    trim: true,
    required: true,
    minLength: 3,
    maxLength: 20,
  },

  is_default: {
    type: Boolean,
    default: false,
    required: true,
  },

  permissible_roles: {
    required: true,
    default: [],
    type: [
      {
        type: String,
        match: /^\d{15,22}$/,
        required: true,
      },
    ],
  },

  created_at: {
    type: Date,
    default: Date.now,
    immutable: true,
    required: true,
  },
});

export default ShiftTypeSchema;
