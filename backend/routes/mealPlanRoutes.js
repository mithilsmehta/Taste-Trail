const express = require("express");
const router = express.Router();
const MealPlan = require("../models/MealPlan");
const GroceryItem = require("../models/GroceryItem");
const authMiddleware = require("../middleware/authMiddleware");

// CREATE OR UPDATE MEAL PLAN
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const { mealType, recipe, time } = req.body;

    // Validate meal type
    if (!["breakfast", "lunch", "dinner"].includes(mealType)) {
      return res.status(400).json({ msg: "Invalid meal type" });
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      return res.status(400).json({ msg: "Invalid time format. Use HH:MM" });
    }

    // Check if meal plan already exists for this user and meal type
    let mealPlan = await MealPlan.findOne({ 
      userId: req.user.id, 
      mealType 
    });

    if (mealPlan) {
      // Update existing meal plan
      mealPlan.recipe = recipe;
      mealPlan.time = time;
      mealPlan.updatedAt = Date.now();
      await mealPlan.save();

      // Delete old grocery items for this meal
      await GroceryItem.deleteMany({ 
        userId: req.user.id, 
        mealPlanId: mealPlan._id 
      });
    } else {
      // Create new meal plan
      mealPlan = await MealPlan.create({
        userId: req.user.id,
        mealType,
        recipe,
        time
      });
    }

    // Create grocery items from ingredients
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      const groceryItems = recipe.ingredients.map(ingredient => ({
        userId: req.user.id,
        name: ingredient,
        mealType,
        mealPlanId: mealPlan._id,
        marked: false
      }));

      await GroceryItem.insertMany(groceryItems);
    }

    res.json({ 
      success: true, 
      mealPlan,
      msg: "Meal plan saved successfully!" 
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to save meal plan" });
  }
});

// GET ALL MEAL PLANS FOR USER
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const mealPlans = await MealPlan.find({ userId: req.user.id });

    // Organize by meal type
    const organized = {
      breakfast: mealPlans.find(mp => mp.mealType === "breakfast") || null,
      lunch: mealPlans.find(mp => mp.mealType === "lunch") || null,
      dinner: mealPlans.find(mp => mp.mealType === "dinner") || null
    };

    res.json(organized);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to fetch meal plans" });
  }
});

// UPDATE MEAL PLAN
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { recipe, time } = req.body;

    // Find meal plan and verify ownership
    const mealPlan = await MealPlan.findById(req.params.id);

    if (!mealPlan) {
      return res.status(404).json({ msg: "Meal plan not found" });
    }

    if (mealPlan.userId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    // Update fields
    if (recipe) mealPlan.recipe = recipe;
    if (time) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(time)) {
        return res.status(400).json({ msg: "Invalid time format" });
      }
      mealPlan.time = time;
    }

    mealPlan.updatedAt = Date.now();
    await mealPlan.save();

    // Update grocery items if recipe changed
    if (recipe) {
      await GroceryItem.deleteMany({ 
        userId: req.user.id, 
        mealPlanId: mealPlan._id 
      });

      if (recipe.ingredients && recipe.ingredients.length > 0) {
        const groceryItems = recipe.ingredients.map(ingredient => ({
          userId: req.user.id,
          name: ingredient,
          mealType: mealPlan.mealType,
          mealPlanId: mealPlan._id,
          marked: false
        }));

        await GroceryItem.insertMany(groceryItems);
      }
    }

    res.json({ success: true, mealPlan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to update meal plan" });
  }
});

// DELETE MEAL PLAN
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const mealPlan = await MealPlan.findById(req.params.id);

    if (!mealPlan) {
      return res.status(404).json({ msg: "Meal plan not found" });
    }

    if (mealPlan.userId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    // Delete associated grocery items
    await GroceryItem.deleteMany({ mealPlanId: mealPlan._id });

    // Delete meal plan
    await MealPlan.findByIdAndDelete(req.params.id);

    res.json({ success: true, msg: "Meal plan deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to delete meal plan" });
  }
});

module.exports = router;
