const mongoose = require("mongoose");

const groceryItemSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    index: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  mealType: { 
    type: String, 
    enum: ["breakfast", "lunch", "dinner"], 
    required: true,
    index: true
  },
  mealPlanId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "MealPlan", 
    required: true 
  },
  marked: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Compound index for efficient queries
groceryItemSchema.index({ userId: 1, mealType: 1 });
groceryItemSchema.index({ userId: 1, marked: 1 });

module.exports = mongoose.model("GroceryItem", groceryItemSchema);
