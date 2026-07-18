const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },

  email: { type: String, required: true, unique: true },
  phone: { type: String, unique: true, sparse: true, default: undefined },

  password: { type: String, required: true },

  resetToken: { type: String, default: null },
  resetTokenExpiry: { type: Date, default: null },

  preferences: {
    diet: { type: String, default: "" },
    allergies: { type: [String], default: [] },
    cuisines: { type: [String], default: [] }
  },

  onboarding: {
    displayName: { type: String, default: "" },
    gender: { type: String, default: "" },
    ethnicity: { type: String, default: "" },
    foodPreference: { type: String, default: "" },
    dietaryPreference: { type: String, default: "" },
    usualServings: { type: Number, default: 2 },
    healthyGoal: { type: Number, default: 50 },
    heightCm: { type: Number, default: null },
    weightKg: { type: Number, default: null },
    bmi: { type: Number, default: null }
  },

  role: { type: String, default: "user" }
});

module.exports = mongoose.model("User", userSchema);
