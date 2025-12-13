const express = require("express");
const router = express.Router();
const UserSettings = require("../models/UserSettings");
const authMiddleware = require("../middleware/authMiddleware");

// GET USER MEAL TIME SETTINGS
router.get("/meal-times", authMiddleware, async (req, res) => {
  try {
    let settings = await UserSettings.findOne({ userId: req.user.id });

    // Create default settings if none exist
    if (!settings) {
      settings = await UserSettings.create({
        userId: req.user.id,
        mealTimes: {
          breakfast: "08:00",
          lunch: "13:00",
          dinner: "20:00"
        },
        notificationOffset: 30,
        notificationsEnabled: false
      });
    }

    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to fetch settings" });
  }
});

// UPDATE MEAL TIME SETTINGS
router.put("/meal-times", authMiddleware, async (req, res) => {
  try {
    const { breakfastTime, lunchTime, dinnerTime, notificationOffset, notificationsEnabled } = req.body;

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (breakfastTime && !timeRegex.test(breakfastTime)) {
      return res.status(400).json({ msg: "Invalid breakfast time format" });
    }
    if (lunchTime && !timeRegex.test(lunchTime)) {
      return res.status(400).json({ msg: "Invalid lunch time format" });
    }
    if (dinnerTime && !timeRegex.test(dinnerTime)) {
      return res.status(400).json({ msg: "Invalid dinner time format" });
    }

    // Validate notification offset
    if (notificationOffset && ![30, 60].includes(notificationOffset)) {
      return res.status(400).json({ msg: "Notification offset must be 30 or 60 minutes" });
    }

    let settings = await UserSettings.findOne({ userId: req.user.id });

    if (!settings) {
      // Create new settings
      settings = await UserSettings.create({
        userId: req.user.id,
        mealTimes: {
          breakfast: breakfastTime || "08:00",
          lunch: lunchTime || "13:00",
          dinner: dinnerTime || "20:00"
        },
        notificationOffset: notificationOffset || 30,
        notificationsEnabled: notificationsEnabled !== undefined ? notificationsEnabled : false
      });
    } else {
      // Update existing settings
      if (breakfastTime) settings.mealTimes.breakfast = breakfastTime;
      if (lunchTime) settings.mealTimes.lunch = lunchTime;
      if (dinnerTime) settings.mealTimes.dinner = dinnerTime;
      if (notificationOffset) settings.notificationOffset = notificationOffset;
      if (notificationsEnabled !== undefined) settings.notificationsEnabled = notificationsEnabled;
      
      settings.updatedAt = Date.now();
      await settings.save();
    }

    res.json({ success: true, settings, msg: "Settings updated successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to update settings" });
  }
});

module.exports = router;
