import {
  isAfter,
  isBefore,
  milliseconds,
  addMilliseconds,
  differenceInMilliseconds,
} from "date-fns";

import { LeaveOfAbsence } from "@Typings/Utilities/Database.js";
import { Schema, model } from "mongoose";
import DHumanize from "humanize-duration";

type LeaveDocument = LeaveOfAbsence.LeaveOfAbsenceHydratedDocument;
const DurationHumanize = DHumanize.humanizer({
  conjunction: " and ",
  largest: 4,
  round: true,
});

const LeaveOfAbsenceSchema = new Schema<
  LeaveOfAbsence.LeaveOfAbsenceDocument,
  LeaveOfAbsence.LeaveModel
>({
  user: {
    type: String,
    ref: "GuildProfile",
    match: /^\d{15,22}$/,
    index: true,
    required: true,
  },

  guild: {
    type: String,
    ref: "Guild",
    match: /^\d{15,22}$/,
    index: true,
    required: true,
  },

  reason: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 500,
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

    default() {
      return addMilliseconds(
        this.review_date || this.request_date,
        this.duration + (this.extension_req?.duration || 0)
      );
    },

    validate: [
      function (this: LeaveDocument, end_date: Date) {
        return isAfter(end_date, this.review_date || this.request_date);
      },
      "The end date must be after the review and request dates of a leave of absence. Value received: {VALUE}.",
    ],
  },

  early_end_date: {
    type: Date,
    default: null,
    required: false,
    validate: [
      function (this: LeaveDocument, date: Date) {
        return date === null ? true : isAfter(date, this.review_date || this.request_date);
      },
      "The early end date must be after the review and request date of a LOA. Value received: {VALUE}.",
    ],
  },

  duration: {
    type: Number,
    required: true,
    minlength: milliseconds({ days: 1 }),
    maxlength: milliseconds({ months: 3 }),
  },

  request_msg: {
    type: String,
    default: null,
    required: false,
    validate: [
      (s: string | null) => s === null || /^\d{15,22}:\d{15,22}$/.test(s),
      "Invalid format for request message id; received: {VALUE}. Format: <requests_channel>:<request_msg_id>.",
    ],
  },

  extension_req: {
    required: false,
    default: null,
    _id: false,
    type: {
      date: {
        type: Date,
        required: true,
        default: Date.now,
      },

      request_msg: {
        type: String,
        default: null,
        required: false,
        validate: [
          (s: string | null) => s === null || /^\d{15,22}:\d{15,22}$/.test(s),
          "Invalid format for request message id; received: {VALUE}. Format: <requests_channel>:<request_msg_id>.",
        ],
      },

      duration: {
        type: Number,
        required: true,
        validate: [
          (d: number) => d <= milliseconds({ months: 1 }) && d >= milliseconds({ hours: 12 }),
          "Extended duration must be between 12 hours and 30 days (1 months). Duration received: {VALUE}.",
        ],
      },

      reason: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 500,
      },

      status: {
        type: String,
        required: true,
        default: "Pending",
        enum: ["Pending", "Approved", "Denied", "Cancelled"],
      },

      review_date: {
        type: Date,
        default: null,
        required: false,
        immutable: true,
      },

      reviewer_notes: {
        type: String,
        default: null,
        required: false,
      },

      reviewed_by: {
        required: false,
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
    },
  },

  review_date: {
    type: Date,
    default: null,
    required: false,
  },

  reviewer_notes: {
    type: String,
    default: null,
    required: false,
  },

  reviewed_by: {
    _id: false,
    default: null,
    required: false,
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

  end_handled: {
    type: Boolean,
    default: false,
    required: true,
  },

  is_manageable: {
    type: Boolean,
    default: true,
    required: true,
  },

  status: {
    type: String,
    required: true,
    default: "Pending",
    enum: ["Pending", "Approved", "Denied", "Cancelled"],
    validate: [
      function (this: LeaveDocument, s: string) {
        if (this.review_date) {
          return s !== "Pending";
        }
        return true;
      },
      "Invalid status. Once a LOA has been reviewed, it cannot be on pending status.",
    ],
  },
});

// ---------------------------------------------------------------------------------------
// Helpers Definitions:
// --------------------
LeaveOfAbsenceSchema.set("optimisticConcurrency", true);
LeaveOfAbsenceSchema.virtual("is_over").get(function (this: LeaveDocument) {
  return (
    this.status === "Approved" &&
    isBefore(
      this.early_end_date ||
        new Date(
          addMilliseconds(
            addMilliseconds(
              this.review_date || this.request_date,
              this.extension_req?.duration || 0
            ),
            this.duration
          )
        ),
      new Date()
    )
  );
});

LeaveOfAbsenceSchema.virtual("is_approved").get(function (this: LeaveDocument) {
  return this.review_date && this.status === "Approved";
});

LeaveOfAbsenceSchema.virtual("is_active").get(function (this: LeaveDocument) {
  return (
    this.review_date &&
    this.status === "Approved" &&
    this.early_end_date === null &&
    isAfter(this.end_date, new Date())
  );
});

LeaveOfAbsenceSchema.virtual("duration_hr").get(function (this: LeaveDocument) {
  const MainPlusExt =
    this.duration + (this.extension_req?.status === "Approved" ? this.extension_req.duration : 0);
  return this.early_end_date && this.review_date
    ? DurationHumanize(differenceInMilliseconds(this.early_end_date, this.review_date))
    : DurationHumanize(MainPlusExt);
});

LeaveOfAbsenceSchema.virtual("original_duration_hr").get(function (this: LeaveDocument) {
  return DurationHumanize(this.duration);
});

LeaveOfAbsenceSchema.virtual("extended_duration_hr").get(function (this: LeaveDocument) {
  if (this.extension_req) {
    return DurationHumanize(this.extension_req.duration);
  }
  return DurationHumanize(0);
});

LeaveOfAbsenceSchema.pre("validate", function PreLeaveValidate() {
  if (this.status === "Pending" || this.status === "Cancelled") return;

  this.end_date = addMilliseconds(
    this.review_date || this.request_date,
    this.duration + (this.extension_req?.status === "Approved" ? this.extension_req.duration : 0)
  );
});

LeaveOfAbsenceSchema.methods.getUpToDate = async function (this: LeaveDocument) {
  return (this.constructor as LeaveOfAbsence.LeaveModel)
    .findById(this._id)
    .exec()
    .then((Doc) => Doc || this);
};

// ---------------------------------------------------------------------------------------
export default model<LeaveOfAbsence.LeaveOfAbsenceDocument, LeaveOfAbsence.LeaveModel>(
  "LeaveOfAbsence",
  LeaveOfAbsenceSchema,
  "leaves"
);
