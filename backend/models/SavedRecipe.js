const mongoose = require("mongoose");

const savedRecipeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  ingredients: { type: Array, required: true },
  steps: { type: Array, required: true },
  image: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("SavedRecipe", savedRecipeSchema);