const { Schema } = require("mongoose");

const ShiftTypeSchema = new Schema({
  _id: {
    type: Schema.Types.ObjectId,
    required: true,
    auto: true,
  },

  name: {
    type: String,
    required: true,
    minLength: 3,
    maxLength: 20,
  },

  is_default: {
    type: Boolean,
    default: false,
  },

  permissible_roles: [
    {
      type: String,
      minLength: 15,
      maxLength: 22,
    },
  ],

  created_at: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
});

module.exports = ShiftTypeSchema;
