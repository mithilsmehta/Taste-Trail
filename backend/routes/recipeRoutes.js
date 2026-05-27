const express = require("express");
const router = express.Router();
const SavedRecipe = require("../models/SavedRecipe");
const authMiddleware = require("../middleware/authMiddleware");
const { enhanceRecipe } = require("../utils/recipeEnhancements");

// SAVE RECIPE
router.post("/save", authMiddleware, async (req, res) => {
  try {
    const { title, ingredients, steps, image, nutrition } = req.body;
    const enhancedRecipe = enhanceRecipe({ title, ingredients, steps, image, nutrition });

    // Check if recipe already exists for this user
    const existing = await SavedRecipe.findOne({ 
      userId: req.user.id, 
      title: title 
    });

    if (existing) {
      return res.status(400).json({ msg: "Recipe already saved!" });
    }

    const saved = await SavedRecipe.create({
      userId: req.user.id,
      title,
      ingredients,
      steps,
      image: enhancedRecipe.image,
      nutrition: enhancedRecipe.nutrition,
    });

    res.json({ msg: "Recipe saved!", recipe: saved });
  } catch (err) {
    res.status(500).json({ msg: "Failed to save recipe" });
  }
});

// GET ALL SAVED RECIPES FOR USER
router.get("/my-recipes", authMiddleware, async (req, res) => {
  try {
    const recipes = await SavedRecipe.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(recipes.map((recipe) => enhanceRecipe(recipe.toObject())));
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch recipes" });
  }
});

// DELETE RECIPE
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    await SavedRecipe.findByIdAndDelete(req.params.id);
    res.json({ msg: "Recipe removed" });
  } catch (err) {
    res.status(500).json({ msg: "Failed to remove recipe" });
  }
});

module.exports = router;
