const mongoose = require("mongoose");

const generatedRecipeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  query: { type: String, required: true },
  normalizedQuery: { type: String, required: true },
  regionalStyle: { type: String, default: "" },
  dietMode: { type: String, enum: ["veg", "jain"], default: "veg" },
  servings: { type: Number, default: 2 },
  name: { type: String, required: true },
  ingredients: { type: [String], default: [] },
  steps: { type: [String], default: [] },
  healthScore: { type: Number, default: 50 },
  healthLabel: { type: String, default: "Moderate" },
  usageCount: { type: Number, default: 0 },
  lastUsedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

generatedRecipeSchema.index({
  normalizedQuery: 1,
  regionalStyle: 1,
  dietMode: 1,
  servings: 1,
  createdAt: -1
});

generatedRecipeSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("GeneratedRecipe", generatedRecipeSchema);
