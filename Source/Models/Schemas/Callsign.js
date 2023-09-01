const { Schema } = require("mongoose");

const CallsignSchema = new Schema({
  holder: {
    type: String,
    required: true,
    match: /^\d{15,22}$/,
  },

  // @see http://forums.radioreference.com/threads/lapd-supervisory-command-staff-callsigns.451920/post-3834919
  info: {
    division: {
      required: true,
      type: Number,
      min: 1,
      max: 35,
    },

    unit_type: {
      type: String,
      enum: ["A", "B", "C", "E", "F", "G", "H", "L", "M", "T", "W", "Y", "I", "K", "X", "Z"],
      required: true,
      uppercase: true,
    },

    identifier: {
      type: String,
      required: true,
      validate: {
        validator: (Value) => {
          return !!Value.match(/^\d{2,3}$|^0\d{1,2}$/);
        },
        message:
          "The callsign identifier must be between two and three digits long (01, 04, 152, etc.).",
      },
    },
  },

  status: {
    requested_on: {
      type: Date,
      default: Date.now,
      required: true,
      immutable: true,
    },

    approving_user: {
      type: String,
      match: /^\d{15,22}$/,
      required: true,
      default: null,
    },

    approved_on: {
      type: Date,
      default: null,
    },
  },
});

CallsignSchema.virtual("formatted").get(function () {
  if (!this.info) return null;
  return this.info.division + this.info.unit_type + "-" + this.info.identifier;
});

module.exports = CallsignSchema;
