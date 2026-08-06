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

  subscription: {
    isPremium: { type: Boolean, default: false },
    status: { type: String, default: "free" },
    plan: { type: String, default: null },
    provider: { type: String, default: null },
    premiumExpiresAt: { type: Date, default: null },
    playProductId: { type: String, default: null },
    playBasePlanId: { type: String, default: null },
    playPurchaseToken: { type: String, default: null },
    googlePlayState: { type: String, default: null },
    autoRenewing: { type: Boolean, default: false },
    cancelReason: { type: String, default: null },
    lastVerifiedAt: { type: Date, default: null }
  },

  role: { type: String, default: "user" }
});

userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });

userSchema.index(
  { "subscription.playPurchaseToken": 1 },
  {
    unique: true,
    partialFilterExpression: {
      "subscription.playPurchaseToken": { $type: "string" }
    }
  }
);

module.exports = mongoose.model("User", userSchema);
