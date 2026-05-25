const express = require("express");
const router = express.Router();
const MealPlan = require("../models/MealPlan");
const GroceryItem = require("../models/GroceryItem");
const SavedRecipe = require("../models/SavedRecipe");
const authMiddleware = require("../middleware/authMiddleware");

const saveRecipeForUser = async (userId, recipe) => {
  if (!recipe?.title) return;

  const existingSavedRecipe = await SavedRecipe.findOne({
    userId,
    title: recipe.title
  });

  if (existingSavedRecipe) return;

  await SavedRecipe.create({
    userId,
    title: recipe.title,
    ingredients: recipe.ingredients || [],
    steps: recipe.steps || [],
    image: recipe.image || ""
  });
};

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

const splitIngredientLines = (ingredients = []) => {
  return ingredients.flatMap((ingredient) => {
    const withoutRecipeLabel = String(ingredient).replace(/^for\s+[^:]+:\s*/i, "");
    const parts = withoutRecipeLabel
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    return parts.length > 1 ? parts : [String(ingredient).trim()].filter(Boolean);
  });
};

const getRecipeIdentityQuery = (userId, recipe, excludeId) => {
  const recipeMatches = [];

  if (recipe?.id) {
    recipeMatches.push({ "recipe.id": recipe.id });
  }

  if (recipe?.title) {
    recipeMatches.push({ "recipe.title": recipe.title });
  }

  if (recipeMatches.length === 0) return null;

  return {
    userId,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    $or: recipeMatches
  };
};

const refreshGroceryItems = async (userId, mealPlan) => {
  await GroceryItem.deleteMany({
    userId,
    mealPlanId: mealPlan._id
  });

  const ingredients = splitIngredientLines(mealPlan.recipe?.ingredients);
  if (ingredients.length === 0) return;

  const groceryItems = ingredients.map(ingredient => ({
    userId,
    name: ingredient,
    mealType: mealPlan.mealType,
    mealPlanId: mealPlan._id,
    marked: false
  }));

  await GroceryItem.insertMany(groceryItems);
};

const removeDuplicateRecipePlans = async (userId, recipe, keepMealPlanId) => {
  const duplicateQuery = getRecipeIdentityQuery(userId, recipe, keepMealPlanId);
  if (!duplicateQuery) return;

  const duplicates = await MealPlan.find(duplicateQuery);

  for (const duplicate of duplicates) {
    await GroceryItem.deleteMany({ mealPlanId: duplicate._id });
    await MealPlan.findByIdAndDelete(duplicate._id);
  }
};

// CREATE OR UPDATE MEAL PLAN
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const { mealType, recipe, time, planDate } = req.body;
    const dayIndex = Number.isInteger(req.body.dayIndex) ? req.body.dayIndex : 0;

    // Validate meal type
    if (!["breakfast", "lunch", "dinner"].includes(mealType)) {
      return res.status(400).json({ msg: "Invalid meal type" });
    }

    if (dayIndex < 0 || dayIndex > 6) {
      return res.status(400).json({ msg: "Invalid day. Choose day 1 to 7" });
    }

    if (planDate && !isValidPlanDate(planDate)) {
      return res.status(400).json({ msg: "Invalid plan date. Use YYYY-MM-DD" });
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      return res.status(400).json({ msg: "Invalid time format. Use HH:MM" });
    }

    // Check if meal plan already exists for this user, meal type, and day
    const existingMealPlanQuery = {
      userId: req.user.id,
      mealType,
      ...(planDate
        ? { planDate }
        : dayIndex === 0
          ? { $or: [{ dayIndex: 0 }, { dayIndex: { $exists: false } }] }
          : { dayIndex })
    };

    const existingRecipePlanQuery = getRecipeIdentityQuery(req.user.id, recipe);
    let mealPlan = existingRecipePlanQuery ? await MealPlan.findOne(existingRecipePlanQuery) : null;

    if (!mealPlan) {
      mealPlan = await MealPlan.findOne(existingMealPlanQuery);
    }

    if (mealPlan) {
      // Update existing meal plan
      mealPlan.mealType = mealType;
      mealPlan.dayIndex = dayIndex;
      if (planDate) mealPlan.planDate = planDate;
      mealPlan.recipe = recipe;
      mealPlan.time = time;
      mealPlan.updatedAt = Date.now();
      await mealPlan.save();
    } else {
      // Create new meal plan
      mealPlan = await MealPlan.create({
        userId: req.user.id,
        mealType,
        dayIndex,
        planDate,
        recipe,
        time
      });
    }

    await removeDuplicateRecipePlans(req.user.id, recipe, mealPlan._id);
    await refreshGroceryItems(req.user.id, mealPlan);

    await saveRecipeForUser(req.user.id, recipe);

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
    const mealPlans = await MealPlan.find({ userId: req.user.id }).sort({ planDate: 1, dayIndex: 1, mealType: 1 });
    const startDate = typeof req.query.startDate === "string" ? req.query.startDate : "";

    if (startDate && !isValidPlanDate(startDate)) {
      return res.status(400).json({ msg: "Invalid start date. Use YYYY-MM-DD" });
    }

    const weekDateKeys = getUpcomingDateKeys(startDate);

    // Organize by meal type
    const organized = {
      breakfast: Array(7).fill(null),
      lunch: Array(7).fill(null),
      dinner: Array(7).fill(null)
    };

    mealPlans.forEach((mealPlan) => {
      const dateIndex = mealPlan.planDate ? weekDateKeys.indexOf(mealPlan.planDate) : -1;
      if (startDate && dateIndex === -1) return;

      const dayIndex = dateIndex >= 0 ? dateIndex : Number.isInteger(mealPlan.dayIndex) ? mealPlan.dayIndex : 0;
      if (organized[mealPlan.mealType] && dayIndex >= 0 && dayIndex <= 6) {
        organized[mealPlan.mealType][dayIndex] = mealPlan;
      }
    });

    res.json(organized);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to fetch meal plans" });
  }
});

// GET RAW MEAL PLANS FOR USER
router.get("/all", authMiddleware, async (req, res) => {
  try {
    const mealPlans = await MealPlan.find({ userId: req.user.id }).sort({ planDate: 1, dayIndex: 1, mealType: 1 });
    res.json(mealPlans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to fetch meal plans" });
  }
});

// UPDATE MEAL PLAN
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { recipe, time, planDate, mealType } = req.body;
    const dayIndex = Number.isInteger(req.body.dayIndex) ? req.body.dayIndex : undefined;

    // Find meal plan and verify ownership
    const mealPlan = await MealPlan.findById(req.params.id);

    if (!mealPlan) {
      return res.status(404).json({ msg: "Meal plan not found" });
    }

    if (mealPlan.userId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    if (mealType && !["breakfast", "lunch", "dinner"].includes(mealType)) {
      return res.status(400).json({ msg: "Invalid meal type" });
    }

    const mealTypeChanged = mealType && mealType !== mealPlan.mealType;
    const recipeChanged = Boolean(recipe);

    // Update fields
    if (mealType) mealPlan.mealType = mealType;
    if (recipe) mealPlan.recipe = recipe;
    if (dayIndex !== undefined) {
      if (dayIndex < 0 || dayIndex > 6) {
        return res.status(400).json({ msg: "Invalid day. Choose day 1 to 7" });
      }
      mealPlan.dayIndex = dayIndex;
    }
    if (planDate) {
      if (!isValidPlanDate(planDate)) {
        return res.status(400).json({ msg: "Invalid plan date. Use YYYY-MM-DD" });
      }
      mealPlan.planDate = planDate;
    }
    if (time) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(time)) {
        return res.status(400).json({ msg: "Invalid time format" });
      }
      mealPlan.time = time;
    }

    if (planDate || dayIndex !== undefined || mealType) {
      const duplicateMealPlan = await MealPlan.findOne({
        _id: { $ne: mealPlan._id },
        userId: req.user.id,
        mealType: mealPlan.mealType,
        ...(mealPlan.planDate ? { planDate: mealPlan.planDate } : { dayIndex: mealPlan.dayIndex })
      });

      if (duplicateMealPlan) {
        await GroceryItem.deleteMany({ mealPlanId: duplicateMealPlan._id });
        await MealPlan.findByIdAndDelete(duplicateMealPlan._id);
      }
    }

    mealPlan.updatedAt = Date.now();
    await mealPlan.save();
    await removeDuplicateRecipePlans(req.user.id, mealPlan.recipe, mealPlan._id);

    // Update grocery items if recipe or meal type changed
    if (recipeChanged || mealTypeChanged) {
      await refreshGroceryItems(req.user.id, mealPlan);

      await saveRecipeForUser(req.user.id, mealPlan.recipe);
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
