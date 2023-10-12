import { Schema } from "mongoose";

const ArrestSchema = new Schema({
  defendant: {
    type: String,
    required: true,
  },
});

export default ArrestSchema;
