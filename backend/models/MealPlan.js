const mongoose = require("mongoose");

const mealPlanSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    index: true 
  },
  mealType: { 
    type: String, 
    enum: ["breakfast", "lunch", "dinner"], 
    required: true,
    index: true
  },
  dayIndex: {
    type: Number,
    min: 0,
    max: 6,
    default: 0,
    index: true
  },
  planDate: {
    type: String,
    match: /^\d{4}-\d{2}-\d{2}$/,
    index: true
  },
  recipe: {
    id: { type: String },
    title: { type: String, required: true },
    ingredients: { type: [String], required: true },
    steps: { type: [String], required: true },
    image: { type: String, default: "" },
    nutrition: {
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 }
    }
  },
  time: { 
    type: String, 
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format
  },
  active: { 
    type: Boolean, 
    default: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update timestamp on save
mealPlanSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compound index for efficient weekly meal queries
mealPlanSchema.index({ userId: 1, mealType: 1, dayIndex: 1 });
mealPlanSchema.index({ userId: 1, mealType: 1, planDate: 1 });

module.exports = mongoose.model("MealPlan", mealPlanSchema);
