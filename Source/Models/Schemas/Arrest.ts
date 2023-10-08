import { Schema } from "mongoose";

export default new Schema({
  defendant: {
    type: String,
    required: true,
  },
});
