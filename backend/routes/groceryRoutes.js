const express = require("express");
const router = express.Router();
const GroceryItem = require("../models/GroceryItem");
const MealPlan = require("../models/MealPlan");
const authMiddleware = require("../middleware/authMiddleware");

const isValidPlanDate = (planDate) => /^\d{4}-\d{2}-\d{2}$/.test(planDate);

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const getUpcomingDateKeys = (startDateKey) => {
  const startDate = startDateKey && isValidPlanDate(startDateKey)
    ? parseDateKey(startDateKey)
    : new Date();
  startDate.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return toDateKey(date);
  });
};

const getRecipeKey = (mealPlan) => {
  return mealPlan?.recipe?.id || mealPlan?.recipe?.title || String(mealPlan?._id);
};

const cleanupGroceryData = async (userId) => {
  const mealPlans = await MealPlan.find({ userId }).sort({ updatedAt: -1 });
  const seenRecipeKeys = new Set();
  const validMealPlanIds = [];

  for (const mealPlan of mealPlans) {
    const recipeKey = getRecipeKey(mealPlan);

    if (seenRecipeKeys.has(recipeKey)) {
      await GroceryItem.deleteMany({ mealPlanId: mealPlan._id });
      await MealPlan.findByIdAndDelete(mealPlan._id);
      continue;
    }

    seenRecipeKeys.add(recipeKey);
    validMealPlanIds.push(mealPlan._id);
  }

  await GroceryItem.deleteMany({
    userId,
    mealPlanId: { $nin: validMealPlanIds }
  });
};

// GET ALL GROCERY ITEMS
router.get("/list", authMiddleware, async (req, res) => {
  try {
    const startDate = typeof req.query.startDate === "string" ? req.query.startDate : "";

    if (startDate && !isValidPlanDate(startDate)) {
      return res.status(400).json({ msg: "Invalid start date. Use YYYY-MM-DD" });
    }

    await cleanupGroceryData(req.user.id);

    const mealPlanQuery = { userId: req.user.id };
    if (startDate) {
      mealPlanQuery.planDate = { $in: getUpcomingDateKeys(startDate) };
    }

    const visibleMealPlans = await MealPlan.find(mealPlanQuery).select("_id");
    const visibleMealPlanIds = visibleMealPlans.map((mealPlan) => mealPlan._id);

    const items = await GroceryItem.find({ userId: req.user.id })
      .where("mealPlanId")
      .in(visibleMealPlanIds)
      .populate("mealPlanId", "recipe.title recipe.id mealType planDate")
      .sort({ mealType: 1, mealPlanId: 1, name: 1 });

    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to fetch grocery list" });
  }
});

// MARK/UNMARK INGREDIENT
router.put("/mark/:itemId", authMiddleware, async (req, res) => {
  try {
    const { marked } = req.body;

    const item = await GroceryItem.findById(req.params.itemId);

    if (!item) {
      return res.status(404).json({ msg: "Item not found" });
    }

    if (item.userId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    item.marked = marked;
    await item.save();

    res.json({ success: true, item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to update item" });
  }
});

// GET GROCERY ITEMS BY MEAL TYPE
router.get("/by-meal/:mealType", authMiddleware, async (req, res) => {
  try {
    const { mealType } = req.params;

    if (!["breakfast", "lunch", "dinner"].includes(mealType)) {
      return res.status(400).json({ msg: "Invalid meal type" });
    }

    const items = await GroceryItem.find({ 
      userId: req.user.id, 
      mealType 
    }).sort({ name: 1 });

    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to fetch items" });
  }
});

// CLEAR ALL MARKED ITEMS
router.delete("/clear-marked", authMiddleware, async (req, res) => {
  try {
    await GroceryItem.deleteMany({ 
      userId: req.user.id, 
      marked: true 
    });

    res.json({ success: true, msg: "Marked items cleared" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to clear items" });
  }
});

module.exports = router;
