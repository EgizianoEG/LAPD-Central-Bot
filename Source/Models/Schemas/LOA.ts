import { HydratedDocumentFromSchema, Model, Schema } from "mongoose";
import { GuildProfiles } from "@Typings/Utilities/Database.js";
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
    validate: [
      function (this: LOAPlainDoc, v: Date) {
        return v.valueOf() > this.request_date.valueOf();
      },
      "End date must be after the requested date of a LOA.",
    ],
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

ProfileLOASchema.virtual("duration").get(function (
  this: HydratedDocumentFromSchema<typeof ProfileLOASchema>
) {
  return this.end_date.valueOf() - this.request_date.valueOf();
});

ProfileLOASchema.virtual("duration_hr").get(function (
  this: HydratedDocumentFromSchema<typeof ProfileLOASchema>
) {
  return DurationHumanize(this.duration);
});

export default ProfileLOASchema;
