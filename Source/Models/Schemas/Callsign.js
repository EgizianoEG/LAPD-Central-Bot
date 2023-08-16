const { Schema } = require("mongoose");

const CitSchema = new Schema({
  // Discord user id of who's holding the callsign
  holder_id: {
    type: String,
    required: true,
  },
});

module.exports = CitSchema;
