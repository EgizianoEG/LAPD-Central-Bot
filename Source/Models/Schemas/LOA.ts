import { GuildProfiles } from "@Typings/Utilities/Database.js";
import { HydratedDocumentFromSchema, Model, Schema } from "mongoose";
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

  requested_on: {
    type: Date,
    default: Date.now,
    required: true,
    immutable: true,
  },

  ends_on: {
    type: Date,
    required: true,
    validate: [
      function (this: LOAPlainDoc, v: Date) {
        return v.valueOf() > this.requested_on.valueOf();
      },
      "End date must be after the requested date of a LOA.",
    ],
  },

  reviewed_on: {
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
  return this.ends_on.valueOf() - this.requested_on.valueOf();
});

ProfileLOASchema.virtual("duration_hr").get(function (
  this: HydratedDocumentFromSchema<typeof ProfileLOASchema>
) {
  return DurationHumanize(this.duration);
});

export default ProfileLOASchema;
