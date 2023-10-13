import { Schema } from "mongoose";

const ShiftTypeSchema = new Schema({
  name: {
    type: String,
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
