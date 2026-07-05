const mongoose = require("mongoose");

const savedRecipeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  ingredients: { type: Array, required: true },
  steps: { type: Array, required: true },
  regionalStyle: { type: String, default: "" },
  dietMode: { type: String, enum: ["veg", "jain", "vegan"], default: "veg" },
  image: { type: String, default: "" },
  servings: { type: Number, default: 2 },
  healthScore: { type: Number, default: 50 },
  healthLabel: { type: String, default: "Moderate" },
  nutrition: {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    fiber: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

savedRecipeSchema.index({ userId: 1, title: 1, regionalStyle: 1, dietMode: 1 });
savedRecipeSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("SavedRecipe", savedRecipeSchema);
