const { Schema } = require("mongoose");

const CitSchema = new Schema({
  defendant: {
    type: String,
    required: true,
  },
});

module.exports = CitSchema;
