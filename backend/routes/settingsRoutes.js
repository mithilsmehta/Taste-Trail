const express = require("express");
const router = express.Router();
const UserSettings = require("../models/UserSettings");
const authMiddleware = require("../middleware/authMiddleware");

const validNotificationOffsets = [30, 60, 90, 120];
const validReminderModes = ["offset", "time"];
const defaultMealTimes = {
  breakfast: "08:00",
  lunch: "13:00",
  dinner: "20:00"
};
const defaultReminderTimes = {
  breakfast: "07:30",
  lunch: "12:30",
  dinner: "19:30"
};
const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

// GET USER MEAL TIME SETTINGS
router.get("/meal-times", authMiddleware, async (req, res) => {
  try {
    let settings = await UserSettings.findOne({ userId: req.user.id });

    // Create default settings if none exist
    if (!settings) {
      settings = await UserSettings.create({
        userId: req.user.id,
        mealTimes: defaultMealTimes,
        notificationOffset: 30,
        reminderMode: "offset",
        reminderTimes: defaultReminderTimes,
        notificationsEnabled: false,
        appNotificationsEnabled: false,
        emailNotificationsEnabled: false
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
    const {
      breakfastTime,
      lunchTime,
      dinnerTime,
      notificationOffset,
      reminderMode,
      reminderTimes,
      notificationsEnabled,
      appNotificationsEnabled,
      emailNotificationsEnabled
    } = req.body;

    // Validate time format
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
    if (notificationOffset && !validNotificationOffsets.includes(notificationOffset)) {
      return res.status(400).json({ msg: "Notification offset must be 30, 60, 90, or 120 minutes" });
    }

    if (reminderMode && !validReminderModes.includes(reminderMode)) {
      return res.status(400).json({ msg: "Invalid reminder mode" });
    }

    if (reminderTimes) {
      for (const mealType of ["breakfast", "lunch", "dinner"]) {
        if (reminderTimes[mealType] && !timeRegex.test(reminderTimes[mealType])) {
          return res.status(400).json({ msg: `Invalid ${mealType} reminder time format` });
        }
      }
    }

    let settings = await UserSettings.findOne({ userId: req.user.id });

    if (!settings) {
      // Create new settings
      settings = await UserSettings.create({
        userId: req.user.id,
        mealTimes: {
          breakfast: breakfastTime || defaultMealTimes.breakfast,
          lunch: lunchTime || defaultMealTimes.lunch,
          dinner: dinnerTime || defaultMealTimes.dinner
        },
        notificationOffset: notificationOffset || 30,
        reminderMode: reminderMode || "offset",
        reminderTimes: {
          breakfast: reminderTimes?.breakfast || defaultReminderTimes.breakfast,
          lunch: reminderTimes?.lunch || defaultReminderTimes.lunch,
          dinner: reminderTimes?.dinner || defaultReminderTimes.dinner
        },
        notificationsEnabled: notificationsEnabled !== undefined ? notificationsEnabled : false,
        appNotificationsEnabled: appNotificationsEnabled !== undefined ? appNotificationsEnabled : notificationsEnabled || false,
        emailNotificationsEnabled: emailNotificationsEnabled !== undefined ? emailNotificationsEnabled : false
      });
    } else {
      // Update existing settings
      if (breakfastTime) settings.mealTimes.breakfast = breakfastTime;
      if (lunchTime) settings.mealTimes.lunch = lunchTime;
      if (dinnerTime) settings.mealTimes.dinner = dinnerTime;
      if (notificationOffset) settings.notificationOffset = notificationOffset;
      if (reminderMode) settings.reminderMode = reminderMode;
      if (reminderTimes) {
        settings.reminderTimes = {
          breakfast: reminderTimes.breakfast || settings.reminderTimes?.breakfast || defaultReminderTimes.breakfast,
          lunch: reminderTimes.lunch || settings.reminderTimes?.lunch || defaultReminderTimes.lunch,
          dinner: reminderTimes.dinner || settings.reminderTimes?.dinner || defaultReminderTimes.dinner
        };
      }
      if (notificationsEnabled !== undefined) settings.notificationsEnabled = notificationsEnabled;
      if (appNotificationsEnabled !== undefined) {
        settings.appNotificationsEnabled = appNotificationsEnabled;
        settings.notificationsEnabled = appNotificationsEnabled;
      }
      if (emailNotificationsEnabled !== undefined) settings.emailNotificationsEnabled = emailNotificationsEnabled;
      
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
