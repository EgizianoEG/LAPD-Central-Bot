import { Schema } from "mongoose";

const CitationSchema = new Schema({
  offender: {
    type: String,
    required: true,
  },
});

export default CitationSchema;
