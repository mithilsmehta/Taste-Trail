const UserSettings = require("../models/UserSettings");
const MealPlan = require("../models/MealPlan");
const transporter = require("../utils/mailer");

const sentReminderKeys = new Set();
const scheduledReminderTimers = new Map();
const mealTypes = ["breakfast", "lunch", "dinner"];
const reminderCatchUpWindowMinutes = 5;
const maxTimerDelayMs = 2_147_483_647;

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

const parseDateKey = (dateKey) => {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
};

const dateWithMinutes = (dateKey, minutes) => {
  const date = parseDateKey(dateKey);
  if (!date) return null;
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
};

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

const buildSentReminderKey = ({ planDate, userId, mealType, settings, mealTime }) => {
  const reminderTime = settings.reminderTimes?.[mealType] || "";
  return `${planDate}:${userId}:${mealType}:${settings.reminderMode || "offset"}:${settings.notificationOffset}:${reminderTime}:${mealTime}`;
};

const buildTimerKey = (mealPlanId) => String(mealPlanId);

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

const sendReminderForMealPlan = async (mealPlanId, options = {}) => {
  const mealPlan = await MealPlan.findById(mealPlanId);
  if (!mealPlan || mealPlan.active === false || !mealPlan.planDate) return false;

  const settings = await UserSettings.findOne({
    userId: mealPlan.userId,
    emailNotificationsEnabled: true
  }).populate("userId");

  const user = settings?.userId;
  if (!settings || !user?.email) return false;

  const mealType = mealPlan.mealType;
  const mealTime = settings.mealTimes?.[mealType] || mealPlan.time;
  if (!mealTime) return false;

  const reminderMinutes = getReminderMinuteForMeal(settings, mealType, mealTime);
  const reminderAt = dateWithMinutes(mealPlan.planDate, reminderMinutes);
  const now = options.now || new Date();

  if (!reminderAt) return false;
  if (!options.allowEarlySend && reminderAt > now) return false;

  const reminderKey = buildSentReminderKey({
    planDate: mealPlan.planDate,
    userId: user._id,
    mealType,
    settings,
    mealTime
  });

  if (sentReminderKeys.has(reminderKey)) return false;

  await sendMealReminderEmail({
    user,
    mealType,
    mealTime,
    offsetMinutes: settings.notificationOffset,
    reminderMode: settings.reminderMode || "offset",
    reminderTime: settings.reminderTimes?.[mealType],
    mealPlan
  });

  sentReminderKeys.add(reminderKey);
  return true;
};

const cancelMealReminderForPlan = (mealPlanId) => {
  const timerKey = buildTimerKey(mealPlanId);
  const timer = scheduledReminderTimers.get(timerKey);
  if (timer) {
    clearTimeout(timer);
    scheduledReminderTimers.delete(timerKey);
  }
};

const cancelMealRemindersForUser = async (userId) => {
  const mealPlans = await MealPlan.find({ userId }).select("_id");
  mealPlans.forEach((mealPlan) => cancelMealReminderForPlan(mealPlan._id));
};

const scheduleMealReminderForPlan = async (mealPlanOrId) => {
  const mealPlanId = mealPlanOrId?._id || mealPlanOrId;
  if (!mealPlanId) return { scheduled: false, reason: "missing-meal-plan-id" };

  cancelMealReminderForPlan(mealPlanId);

  const mealPlan = mealPlanOrId?._id ? mealPlanOrId : await MealPlan.findById(mealPlanId);
  if (!mealPlan || mealPlan.active === false || !mealPlan.planDate) {
    return { scheduled: false, reason: "missing-active-dated-meal-plan" };
  }

  const settings = await UserSettings.findOne({
    userId: mealPlan.userId,
    emailNotificationsEnabled: true
  });

  if (!settings) {
    return { scheduled: false, reason: "email-reminders-disabled" };
  }

  const mealTime = settings.mealTimes?.[mealPlan.mealType] || mealPlan.time;
  if (!mealTime) {
    return { scheduled: false, reason: "missing-meal-time" };
  }

  const reminderMinutes = getReminderMinuteForMeal(settings, mealPlan.mealType, mealTime);
  const reminderAt = dateWithMinutes(mealPlan.planDate, reminderMinutes);
  const now = new Date();

  if (!reminderAt || reminderAt <= now) {
    return { scheduled: false, reason: "reminder-time-passed" };
  }

  const delayMs = reminderAt.getTime() - now.getTime();
  if (delayMs > maxTimerDelayMs) {
    return { scheduled: false, reason: "reminder-too-far-away" };
  }

  const timer = setTimeout(() => {
    scheduledReminderTimers.delete(buildTimerKey(mealPlanId));
    sendReminderForMealPlan(mealPlanId, { allowEarlySend: true }).catch((err) => {
      console.error("Scheduled meal reminder failed:", err);
    });
  }, delayMs);

  scheduledReminderTimers.set(buildTimerKey(mealPlanId), timer);
  return { scheduled: true, reminderAt };
};

const scheduleUpcomingMealReminders = async (userId) => {
  const todayKey = formatDateKey(new Date());
  const query = {
    active: { $ne: false },
    planDate: { $gte: todayKey },
    ...(userId ? { userId } : {})
  };

  const mealPlans = await MealPlan.find(query);
  await Promise.all(mealPlans.map((mealPlan) => scheduleMealReminderForPlan(mealPlan)));
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
      const minutesSinceReminder = nowMinutes - reminderMinutes;
      if (minutesSinceReminder < 0 || minutesSinceReminder > reminderCatchUpWindowMinutes) continue;

      const reminderTime = settings.reminderTimes?.[mealType];
      const reminderKey = buildSentReminderKey({
        planDate: dateKey,
        userId: user._id,
        mealType,
        settings,
        mealTime
      });
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
  scheduleUpcomingMealReminders().catch((err) => {
    console.error("Upcoming meal reminder scheduling failed:", err);
  });

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

module.exports = {
  startMealReminderService,
  scheduleMealReminderForPlan,
  cancelMealReminderForPlan,
  cancelMealRemindersForUser,
  scheduleUpcomingMealReminders
};
