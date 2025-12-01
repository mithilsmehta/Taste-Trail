const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  preferences: {
    diet: { type: String, default: "" },
    allergies: { type: [String], default: [] },
    cuisines: { type: [String], default: [] }
  },
  role: {
    type: String,
    default: "user"
  }
});

module.exports = mongoose.model("User", userSchema);