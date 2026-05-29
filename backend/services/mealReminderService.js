const UserSettings = require("../models/UserSettings");
const MealPlan = require("../models/MealPlan");
const MealReminder = require("../models/MealReminder");
const transporter = require("../utils/mailer");

const scheduledReminderTimers = new Map();
const maxTimerDelayMs = 2_147_483_647;
const sendingLockTimeoutMinutes = 5;

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

const getReminderScheduleForPlan = (mealPlan, settings) => {
  const mealType = mealPlan.mealType;
  const mealTime = settings.mealTimes?.[mealType] || mealPlan.time;
  if (!mealTime || !mealPlan.planDate) return null;

  const reminderMinutes = getReminderMinuteForMeal(settings, mealType, mealTime);
  const reminderAt = dateWithMinutes(mealPlan.planDate, reminderMinutes);
  if (!reminderAt) return null;

  return { mealTime, reminderAt };
};

const buildTimerKey = (mealPlanId) => String(mealPlanId);

const buildReminderRecordKey = (mealPlanId, reminderAt) => {
  return `${mealPlanId}:${reminderAt.toISOString()}`;
};

const escapeHtml = (value) => {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const acquireReminderRecord = async ({ mealPlan, reminderAt }) => {
  const reminderKey = buildReminderRecordKey(mealPlan._id, reminderAt);
  const now = new Date();
  const staleSendingBefore = new Date(now.getTime() - sendingLockTimeoutMinutes * 60 * 1000);

  try {
    return await MealReminder.findOneAndUpdate(
      {
        reminderKey,
        $or: [
          { status: { $exists: false } },
          { status: "failed" },
          { status: "sending", updatedAt: { $lte: staleSendingBefore } }
        ]
      },
      {
        $setOnInsert: {
          reminderKey,
          userId: mealPlan.userId,
          mealPlanId: mealPlan._id,
          mealType: mealPlan.mealType,
          planDate: mealPlan.planDate,
          reminderAt
        },
        $set: {
          status: "sending",
          lastError: ""
        },
        $inc: { attempts: 1 }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );
  } catch (err) {
    if (err?.code === 11000) return null;
    throw err;
  }
};

const sendMealReminderEmail = async ({ user, mealType, mealTime, offsetMinutes, reminderMode, reminderTime, mealPlan }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email reminders cannot be sent because EMAIL_USER or EMAIL_PASS is missing.");
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

  const schedule = getReminderScheduleForPlan(mealPlan, settings);
  if (!schedule) return false;

  const now = options.now || new Date();
  const { mealTime, reminderAt } = schedule;

  if (!options.allowEarlySend && reminderAt > now) return false;

  const reminderRecord = await acquireReminderRecord({ mealPlan, reminderAt });
  if (!reminderRecord) return false;

  try {
    await sendMealReminderEmail({
      user,
      mealType: mealPlan.mealType,
      mealTime,
      offsetMinutes: settings.notificationOffset,
      reminderMode: settings.reminderMode || "offset",
      reminderTime: settings.reminderTimes?.[mealPlan.mealType],
      mealPlan
    });

    await MealReminder.findByIdAndUpdate(reminderRecord._id, {
      status: "sent",
      sentAt: new Date(),
      lastError: ""
    });
  } catch (err) {
    await MealReminder.findByIdAndUpdate(reminderRecord._id, {
      status: "failed",
      lastError: err.message || "Failed to send reminder email"
    });
    throw err;
  }

  return true;
};

const cancelScheduledTimerForPlan = (mealPlanId) => {
  const timerKey = buildTimerKey(mealPlanId);
  const timer = scheduledReminderTimers.get(timerKey);
  if (timer) {
    clearTimeout(timer);
    scheduledReminderTimers.delete(timerKey);
  }
};

const cancelReminderRecordsForPlan = (mealPlanId, exceptReminderAt) => {
  const query = {
    mealPlanId,
    status: { $ne: "sent" }
  };

  if (exceptReminderAt) {
    query.reminderAt = { $ne: exceptReminderAt };
  }

  return MealReminder.updateMany(query, { status: "cancelled" });
};

const cancelMealReminderForPlan = (mealPlanId) => {
  cancelScheduledTimerForPlan(mealPlanId);

  cancelReminderRecordsForPlan(mealPlanId).catch((err) => {
    console.error("Failed to cancel meal reminder records:", err);
  });
};

const cancelMealRemindersForUser = async (userId) => {
  const mealPlans = await MealPlan.find({ userId }).select("_id");
  mealPlans.forEach((mealPlan) => cancelScheduledTimerForPlan(mealPlan._id));

  await MealReminder.updateMany(
    {
      userId,
      status: { $ne: "sent" }
    },
    { status: "cancelled" }
  );
};

const scheduleMealReminderForPlan = async (mealPlanOrId) => {
  const mealPlanId = mealPlanOrId?._id || mealPlanOrId;
  if (!mealPlanId) return { scheduled: false, reason: "missing-meal-plan-id" };

  cancelScheduledTimerForPlan(mealPlanId);

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

  const schedule = getReminderScheduleForPlan(mealPlan, settings);
  if (!schedule) {
    return { scheduled: false, reason: "missing-meal-time" };
  }

  const { reminderAt } = schedule;
  cancelReminderRecordsForPlan(mealPlanId, reminderAt).catch((err) => {
    console.error("Failed to cancel stale meal reminder records:", err);
  });

  const now = new Date();
  if (reminderAt <= now) {
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
  const todayKey = formatDateKey(now);

  const settingsList = await UserSettings.find({ emailNotificationsEnabled: true }).select(
    "userId mealTimes reminderMode reminderTimes notificationOffset"
  );

  for (const settings of settingsList) {
    const mealPlans = await MealPlan.find({
      userId: settings.userId,
      active: { $ne: false },
      planDate: { $gte: todayKey }
    });

    for (const mealPlan of mealPlans) {
      const schedule = getReminderScheduleForPlan(mealPlan, settings);
      if (!schedule || schedule.reminderAt > now) continue;

      try {
        await sendReminderForMealPlan(mealPlan._id, { allowEarlySend: true, now });
      } catch (err) {
        console.error("Meal reminder email failed:", err);
      }
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
