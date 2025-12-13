const express = require("express");
const router = express.Router();
const GroceryItem = require("../models/GroceryItem");
const authMiddleware = require("../middleware/authMiddleware");

// GET ALL GROCERY ITEMS
router.get("/list", authMiddleware, async (req, res) => {
  try {
    const items = await GroceryItem.find({ userId: req.user.id })
      .populate("mealPlanId", "recipe.title mealType")
      .sort({ mealType: 1, name: 1 });

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
