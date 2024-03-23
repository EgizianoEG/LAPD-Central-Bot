import { HydratedDocumentFromSchema, Model, Schema } from "mongoose";
import { GuildProfiles } from "@Typings/Utilities/Database.js";
import { milliseconds } from "date-fns/milliseconds";
import DHumanize from "humanize-duration";

const DurationHumanize = DHumanize.humanizer({
  conjunction: " and ",
  largest: 3,
  round: true,
});

type LOAPlainDoc = GuildProfiles.LeaveOfAbsenceDocument;
type LOAModelType = Model<LOAPlainDoc>;

const ProfileLOASchema = new Schema<LOAPlainDoc, LOAModelType>({
  reason: {
    type: String,
    required: true,
  },

  request_date: {
    type: Date,
    default: Date.now,
    required: true,
    immutable: true,
  },

  end_date: {
    type: Date,
    required: true,

    default(this: LOAPlainDoc) {
      const AdditionDate = this.review_date || this.request_date || new Date();
      return new Date(AdditionDate.getTime() + this.duration);
    },

    validate: [
      function (this: LOAPlainDoc, v: Date) {
        return v.valueOf() > this.request_date.valueOf();
      },
      "End date must be after the requested date of a LOA.",
    ],
  },

  duration: {
    type: Number,
    required: true,
    minlength: milliseconds({ days: 1 }),
    maxlength: milliseconds({ months: 3 }),
  },

  review_date: {
    type: Date,
    default: null,
    required: true,
    immutable: true,
  },

  reviewer_comment: {
    type: String,
    default: null,
    required: true,
  },

  reviewed_by: {
    required: true,
    default: null,
    _id: false,
    type: {
      id: {
        type: String,
        match: /^\d{15,22}$/,
        required: true,
      },

      username: {
        type: String,
        required: true,
        minLength: 2,
        maxLength: 32,
      },
    },
  },

  status: {
    type: String,
    required: true,
    default: "Pending",
    enum: ["Pending", "Approved", "Denied"],
  },
});

ProfileLOASchema.virtual("duration_hr").get(function (
  this: HydratedDocumentFromSchema<typeof ProfileLOASchema>
) {
  return DurationHumanize(this.duration);
});

export default ProfileLOASchema;
