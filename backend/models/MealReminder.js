const mongoose = require("mongoose");

const mealReminderSchema = new mongoose.Schema({
  reminderKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  mealPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MealPlan",
    required: true,
    index: true
  },
  mealType: {
    type: String,
    enum: ["breakfast", "lunch", "dinner"],
    required: true,
    index: true
  },
  planDate: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/,
    index: true
  },
  reminderAt: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ["sending", "sent", "failed", "cancelled"],
    default: "sending",
    index: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  sentAt: {
    type: Date
  },
  lastError: {
    type: String,
    default: ""
  }
}, {
  timestamps: true
});

mealReminderSchema.index({ userId: 1, planDate: 1, mealType: 1 });
mealReminderSchema.index({ status: 1, reminderAt: 1 });

module.exports = mongoose.model("MealReminder", mealReminderSchema);
