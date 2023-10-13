import { Schema } from "mongoose";
import Util from "node:util";

const CallsignSchema = new Schema(
  {
    holder: {
      type: String,
      required: true,
      immutable: true,
    },

    /** @see http://forums.radioreference.com/threads/lapd-supervisory-command-staff-callsigns.451920/post-3834919 */
    designation: {
      _id: false,
      required: true,
      immutable: true,
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
          enum: {
            values: [
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
            message:
              "The callsign unit type must be one of the following: A, B, C, E, F, G, K9, H, L, M, N, P, R, S, U, T, W, Y, I, K, X, Z.\n{VALUE} is not supported.",
          },
        },

        identifier: {
          type: String,
          trim: true,
          required: true,
          validate: {
            validator: (Value: string) => {
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
          ref: "GuildProfile",
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
  },
  {
    virtuals: {
      formatted: {
        get() {
          return Util.format(
            "%d%s-%s",
            this.designation.division,
            this.designation.unit_type,
            this.designation.identifier
          ) as `${number}${string}-${string}`;
        },
      },
    },
  }
);

CallsignSchema.set("versionKey", false);
export default CallsignSchema;
