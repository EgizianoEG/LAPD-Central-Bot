import { Schema } from "mongoose";

const CallsignSchema = new Schema({
  holder: {
    type: Schema.Types.ObjectId,
    required: true,
    immutable: true,
  },

  formatted: {
    type: String,
    default: "",
  },

  // @see http://forums.radioreference.com/threads/lapd-supervisory-command-staff-callsigns.451920/post-3834919
  designation: {
    _id: false,
    required: true,
    alias: "callsign",
    type: {
      division: {
        type: Number,
        required: true,
        min: 1,
        max: 35,
      },

      unit_type: {
        type: String,
        trim: true,
        required: true,
        uppercase: true,
        enum: [
          "A",
          "B",
          "C",
          "E",
          "F",
          "G",
          "K9",
          "H",
          "L",
          "M",
          "N",
          "P",
          "R",
          "S",
          "U",
          "T",
          "W",
          "Y",
          "I",
          "K",
          "X",
          "Z",
        ],
      },

      identifier: {
        type: String,
        trim: true,
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
  },

  status: {
    _id: false,
    default: {},
    type: {
      requested_on: {
        type: Date,
        default: Date.now,
        required: true,
        immutable: true,
      },

      approving_user: {
        type: String,
        match: /^\d{15,22}$/,
        default: null,
        required: false,
      },

      approved_on: {
        type: Date,
        default: null,
        required: false,
      },
    },
  },
});

CallsignSchema.set("versionKey", false);
CallsignSchema.remove("formatted");
CallsignSchema.virtual("formatted").get(function () {
  return this.designation.division + this.designation.unit_type + "-" + this.designation.identifier;
});

export default CallsignSchema;
