// NotificationManager - Handles browser notifications for meal reminders

class NotificationManager {
  constructor() {
    this.scheduledNotifications = [];
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
  scheduleNotification(mealType, mealTime, offsetMinutes, ingredients = []) {
    if (!this.isPermitted()) {
      console.log("Notifications not permitted");
      return null;
    }

    // Parse meal time (HH:MM format)
    const [hours, minutes] = mealTime.split(":").map(Number);
    
    // Create date object for today's meal time
    const mealDate = new Date();
    mealDate.setHours(hours, minutes, 0, 0);

    // Calculate notification time (offset minutes before meal)
    const notificationTime = new Date(mealDate.getTime() - offsetMinutes * 60000);
    const now = new Date();

    // If notification time has passed today, schedule for tomorrow
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

      // Reschedule for next day
      this.scheduleNotification(mealType, mealTime, offsetMinutes, ingredients);
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
    if (!this.isPermitted()) {
      console.log("Notifications not permitted");
      return;
    }

    // Cancel existing notifications
    this.cancelAllNotifications();

    const { mealTimes, notificationOffset } = settings;

    // Schedule breakfast notification
    if (mealPlans.breakfast) {
      this.scheduleNotification(
        "breakfast",
        mealTimes.breakfast,
        notificationOffset,
        mealPlans.breakfast.recipe.ingredients
      );
    }

    // Schedule lunch notification
    if (mealPlans.lunch) {
      this.scheduleNotification(
        "lunch",
        mealTimes.lunch,
        notificationOffset,
        mealPlans.lunch.recipe.ingredients
      );
    }

    // Schedule dinner notification
    if (mealPlans.dinner) {
      this.scheduleNotification(
        "dinner",
        mealTimes.dinner,
        notificationOffset,
        mealPlans.dinner.recipe.ingredients
      );
    }

    console.log("All meal notifications scheduled");
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
