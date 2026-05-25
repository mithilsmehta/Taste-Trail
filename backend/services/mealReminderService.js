const UserSettings = require("../models/UserSettings");
const MealPlan = require("../models/MealPlan");
const transporter = require("../utils/mailer");

const sentReminderKeys = new Set();
const mealTypes = ["breakfast", "lunch", "dinner"];

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const minutesFromTime = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const currentMinutes = (date) => date.getHours() * 60 + date.getMinutes();

const getReminderMinutes = (mealTime, offsetMinutes) => {
  const minutes = minutesFromTime(mealTime) - offsetMinutes;
  return (minutes + 24 * 60) % (24 * 60);
};

const getReminderMinuteForMeal = (settings, mealType, mealTime) => {
  if (settings.reminderMode === "time" && settings.reminderTimes?.[mealType]) {
    return minutesFromTime(settings.reminderTimes[mealType]);
  }

  return getReminderMinutes(mealTime, settings.notificationOffset);
};

const getPlannedMealForDate = async (userId, mealType, planDate) => {
  if (!planDate) return null;

  return MealPlan.findOne({
    userId,
    mealType,
    planDate,
    active: { $ne: false }
  }).sort({ updatedAt: -1 });
};

const escapeHtml = (value) => {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const trimSentReminderCache = (dateKey) => {
  for (const key of sentReminderKeys) {
    if (!key.startsWith(`${dateKey}:`)) {
      sentReminderKeys.delete(key);
    }
  }
};

const sendMealReminderEmail = async ({ user, mealType, mealTime, offsetMinutes, reminderMode, reminderTime, mealPlan }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("Email reminders skipped: EMAIL_USER or EMAIL_PASS is missing.");
    return;
  }

  const recipeTitle = mealPlan?.recipe?.title || `${mealType} meal`;
  const ingredients = mealPlan?.recipe?.ingredients || [];
  const ingredientPreview = ingredients.length
    ? ingredients.slice(0, 5).map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>Open TasteTrail to check your saved meal plan.</li>";

  await transporter.sendMail({
    from: `"TasteTrail" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `Meal Reminder: ${recipeTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.5; max-width: 620px; margin: 0 auto;">
        <div style="background: #ffc107; padding: 22px; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">TasteTrail Meal Reminder</h1>
        </div>
        <div style="border: 1px solid #eee; border-top: 0; padding: 24px; border-radius: 0 0 12px 12px;">
          <p>Hello ${escapeHtml(user.firstName || "there")},</p>
          <p>Your <strong>${escapeHtml(mealType)}</strong> is scheduled at <strong>${escapeHtml(mealTime)}</strong>.</p>
          <p>${
            reminderMode === "time"
              ? `This reminder was sent at <strong>${escapeHtml(reminderTime)}</strong>.`
              : `This reminder was sent <strong>${offsetMinutes} minutes before</strong> your meal.`
          }</p>
          <h2 style="font-size: 20px;">${escapeHtml(recipeTitle)}</h2>
          <ul>${ingredientPreview}</ul>
          <p>Open TasteTrail to view your full meal plan and recipe steps.</p>
        </div>
      </div>
    `
  });
};

const checkMealReminders = async () => {
  const now = new Date();
  const nowMinutes = currentMinutes(now);
  const dateKey = formatDateKey(now);

  trimSentReminderCache(dateKey);

  const settingsList = await UserSettings.find({ emailNotificationsEnabled: true }).populate("userId");

  for (const settings of settingsList) {
    const user = settings.userId;
    if (!user?.email) continue;

    for (const mealType of mealTypes) {
      const mealTime = settings.mealTimes?.[mealType];
      if (!mealTime) continue;

      const reminderMinutes = getReminderMinuteForMeal(settings, mealType, mealTime);
      if (reminderMinutes !== nowMinutes) continue;

      const reminderTime = settings.reminderTimes?.[mealType];
      const reminderKey = `${dateKey}:${user._id}:${mealType}:${settings.reminderMode || "offset"}:${settings.notificationOffset}:${reminderTime || ""}:${mealTime}`;
      if (sentReminderKeys.has(reminderKey)) continue;

      const mealPlan = await getPlannedMealForDate(user._id, mealType, dateKey);
      if (!mealPlan) {
        continue;
      }

      await sendMealReminderEmail({
        user,
        mealType,
        mealTime,
        offsetMinutes: settings.notificationOffset,
        reminderMode: settings.reminderMode || "offset",
        reminderTime,
        mealPlan
      });

      sentReminderKeys.add(reminderKey);
    }
  }
};

const startMealReminderService = () => {
  checkMealReminders().catch((err) => {
    console.error("Meal reminder check failed:", err);
  });

  setInterval(() => {
    checkMealReminders().catch((err) => {
      console.error("Meal reminder check failed:", err);
    });
  }, 60 * 1000);

  console.log("Meal reminder service started");
};

module.exports = { startMealReminderService };
