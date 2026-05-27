/*
Admin dashboard API is disabled for now.
Uncomment this file and re-enable it in backend/app.js when needed.

const express = require("express");
const User = require("../models/User");
const SavedRecipe = require("../models/SavedRecipe");
const MealPlan = require("../models/MealPlan");
const VisionScan = require("../models/VisionScan");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ msg: "Admin access required" });
  }
  next();
};

router.get("/dashboard", authMiddleware, adminOnly, async (req, res) => {
  try {
    const [users, savedRecipes, mealPlans, scans, popularSavedRecipes, popularMealPlans, popularScannedIngredients, recentUsers] = await Promise.all([
      User.countDocuments(),
      SavedRecipe.countDocuments(),
      MealPlan.countDocuments(),
      VisionScan.countDocuments(),
      SavedRecipe.aggregate([
        { $group: { _id: "$title", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 }
      ]),
      MealPlan.aggregate([
        { $group: { _id: "$recipe.title", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 }
      ]),
      VisionScan.aggregate([
        { $unwind: "$ingredients" },
        { $group: { _id: "$ingredients", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      User.find().select("firstName lastName email role").sort({ _id: -1 }).limit(8)
    ]);

    res.json({
      totals: {
        users,
        savedRecipes,
        mealPlans,
        scans
      },
      popularSavedRecipes,
      popularMealPlans,
      popularScannedIngredients,
      recentUsers
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to load admin dashboard" });
  }
});

module.exports = router;
*/
