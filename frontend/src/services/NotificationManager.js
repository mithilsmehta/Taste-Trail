import { apiUrl } from "../utils/api";
// NotificationManager - Handles browser notifications for meal reminders

class NotificationManager {
  constructor() {
    this.scheduledNotifications = [];
    this.initializedForToken = "";
  }

  // Request notification permission from browser
  async requestPermission() {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  // Check if notifications are supported and permitted
  isSupported() {
    return "Notification" in window;
  }

  isPermitted() {
    return this.isSupported() && Notification.permission === "granted";
  }

  // Send immediate notification
  sendNotification(title, body, data = {}) {
    if (!this.isPermitted()) {
      console.log("Notifications not permitted");
      return null;
    }

    const notification = new Notification(title, {
      body,
      icon: "/meal-icon.png",
      badge: "/badge-icon.png",
      tag: data.tag || "meal-notification",
      requireInteraction: false,
      data
    });

    // Handle notification click
    notification.onclick = () => {
      window.focus();
      if (data.url) {
        window.location.href = data.url;
      }
      notification.close();
    };

    return notification;
  }

  // Schedule a notification for a specific time
  scheduleNotification(mealType, mealTime, offsetMinutes, ingredients = [], reminderTime = "") {
    if (!this.isPermitted()) {
      console.log("Notifications not permitted");
      return null;
    }

    const [hours, minutes] = (reminderTime || mealTime).split(":").map(Number);

    const notificationTime = new Date();
    notificationTime.setHours(hours, minutes, 0, 0);
    if (!reminderTime) {
      notificationTime.setMinutes(notificationTime.getMinutes() - offsetMinutes);
    }
    const now = new Date();

    if (notificationTime <= now) {
      notificationTime.setDate(notificationTime.getDate() + 1);
    }

    const delay = notificationTime.getTime() - now.getTime();

    console.log(`Scheduling ${mealType} notification for ${notificationTime.toLocaleString()}`);

    // Schedule the notification
    const timeoutId = setTimeout(() => {
      const ingredientsList = ingredients.length > 0 
        ? ingredients.slice(0, 3).join(", ") + (ingredients.length > 3 ? "..." : "")
        : "Check your meal plan";

      this.sendNotification(
        `Time to prepare ${mealType}! 🍽️`,
        `Ingredients: ${ingredientsList}`,
        {
          tag: `meal-${mealType}`,
          url: "/meal-planner"
        }
      );

      this.scheduleNotification(mealType, mealTime, offsetMinutes, ingredients, reminderTime);
    }, delay);

    // Store timeout ID for cancellation
    this.scheduledNotifications.push({
      mealType,
      timeoutId
    });

    return timeoutId;
  }

  // Cancel a scheduled notification
  cancelNotification(mealType) {
    const index = this.scheduledNotifications.findIndex(n => n.mealType === mealType);
    if (index !== -1) {
      clearTimeout(this.scheduledNotifications[index].timeoutId);
      this.scheduledNotifications.splice(index, 1);
      console.log(`Cancelled ${mealType} notification`);
    }
  }

  // Cancel all scheduled notifications
  cancelAllNotifications() {
    this.scheduledNotifications.forEach(n => clearTimeout(n.timeoutId));
    this.scheduledNotifications = [];
    console.log("Cancelled all notifications");
  }

  // Schedule all meal notifications based on settings and meal plans
  async scheduleAllMealNotifications(settings, mealPlans) {
    if (!settings.appNotificationsEnabled && !settings.notificationsEnabled) {
      this.cancelAllNotifications();
      return;
    }

    if (!this.isPermitted()) {
      console.log("Notifications not permitted");
      return;
    }

    // Cancel existing notifications
    this.cancelAllNotifications();

    const { mealTimes, notificationOffset, reminderMode, reminderTimes } = settings;
    const firstPlannedMeal = (mealType) => {
      const plans = mealPlans?.[mealType];
      return Array.isArray(plans) ? plans.find(Boolean) : plans;
    };

    // Schedule breakfast notification
    const breakfastPlan = firstPlannedMeal("breakfast");
    if (breakfastPlan) {
      this.scheduleNotification(
        "breakfast",
        mealTimes.breakfast,
        notificationOffset,
        breakfastPlan.recipe.ingredients,
        reminderMode === "time" ? reminderTimes?.breakfast : ""
      );
    }

    // Schedule lunch notification
    const lunchPlan = firstPlannedMeal("lunch");
    if (lunchPlan) {
      this.scheduleNotification(
        "lunch",
        mealTimes.lunch,
        notificationOffset,
        lunchPlan.recipe.ingredients,
        reminderMode === "time" ? reminderTimes?.lunch : ""
      );
    }

    // Schedule dinner notification
    const dinnerPlan = firstPlannedMeal("dinner");
    if (dinnerPlan) {
      this.scheduleNotification(
        "dinner",
        mealTimes.dinner,
        notificationOffset,
        dinnerPlan.recipe.ingredients,
        reminderMode === "time" ? reminderTimes?.dinner : ""
      );
    }

    console.log("All meal notifications scheduled");
  }

  async initializeFromSavedSettings(token) {
    if (!token || this.initializedForToken === token) return;
    this.initializedForToken = token;

    try {
      // App notifications are temporarily disabled. Restore the block below when enabling them again.
      this.cancelAllNotifications();
      return;

      /*
      const settingsRes = await fetch(apiUrl("/api/settings/meal-times"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const settings = await settingsRes.json();

      const appNotificationsEnabled = settings.appNotificationsEnabled ?? settings.notificationsEnabled;
      if (!appNotificationsEnabled) {
        this.cancelAllNotifications();
        return;
      }

      if (!this.isPermitted()) return;

      const mealPlansRes = await fetch(apiUrl("/api/meal-plans/my"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const mealPlans = await mealPlansRes.json();

      await this.scheduleAllMealNotifications(
        {
          mealTimes: settings.mealTimes,
          notificationOffset: settings.notificationOffset,
          reminderMode: settings.reminderMode || "offset",
          reminderTimes: settings.reminderTimes,
          appNotificationsEnabled
        },
        mealPlans
      );
      */
    } catch (err) {
      console.error("Failed to initialize meal notifications:", err);
    }
  }

  resetInitialization() {
    this.initializedForToken = "";
    this.cancelAllNotifications();
  }

  // Test notification (for debugging)
  testNotification() {
    this.sendNotification(
      "Test Notification 🔔",
      "This is a test notification from TasteTrail!",
      { tag: "test" }
    );
  }
}

// Export singleton instance
const notificationManager = new NotificationManager();
export default notificationManager;
