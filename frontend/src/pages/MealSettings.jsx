import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import notificationManager from "../services/NotificationManager";
import "./MealSettings.css";

const notificationOffsets = [
  { value: 30, label: "30 minutes before meal" },
  { value: 60, label: "1 hour before meal" },
  { value: 90, label: "1 hour 30 minutes before meal" },
  { value: 120, label: "2 hours before meal" }
];

const defaultReminderTimes = {
  breakfast: "07:30",
  lunch: "12:30",
  dinner: "19:30"
};

const hourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
const minuteOptions = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));

const toTwelveHourTime = (time) => {
  const [hourValue = 0, minuteValue = 0] = String(time || "00:00").split(":").map(Number);
  const period = hourValue >= 12 ? "PM" : "AM";
  const hour = hourValue % 12 || 12;

  return {
    hour: String(hour).padStart(2, "0"),
    minute: String(minuteValue).padStart(2, "0"),
    period
  };
};

const toTwentyFourHourTime = ({ hour, minute, period }) => {
  let hourValue = Number(hour);

  if (period === "PM" && hourValue !== 12) hourValue += 12;
  if (period === "AM" && hourValue === 12) hourValue = 0;

  return `${String(hourValue).padStart(2, "0")}:${minute}`;
};

function TimeDropdownPicker({ value, onChange }) {
  const selectedTime = toTwelveHourTime(value);

  const updateTime = (field, nextValue) => {
    onChange(toTwentyFourHourTime({
      ...selectedTime,
      [field]: nextValue
    }));
  };

  return (
    <div className="time-dropdown-picker">
      <select
        className="form-select"
        value={selectedTime.hour}
        onChange={(e) => updateTime("hour", e.target.value)}
        aria-label="Hour"
      >
        {hourOptions.map((hour) => (
          <option key={hour} value={hour}>{hour}</option>
        ))}
      </select>
      <select
        className="form-select"
        value={selectedTime.minute}
        onChange={(e) => updateTime("minute", e.target.value)}
        aria-label="Minute"
      >
        {minuteOptions.map((minute) => (
          <option key={minute} value={minute}>{minute}</option>
        ))}
      </select>
      <select
        className="form-select"
        value={selectedTime.period}
        onChange={(e) => updateTime("period", e.target.value)}
        aria-label="AM or PM"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

export default function MealSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    breakfastTime: "08:00",
    lunchTime: "13:00",
    dinnerTime: "20:00",
    notificationOffset: 30,
    reminderMode: "time",
    reminderTimes: defaultReminderTimes,
    appNotificationsEnabled: false,
    emailNotificationsEnabled: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState("default");

  useEffect(() => {
    loadSettings();
    checkNotificationPermission();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/settings/meal-times", {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      
      setSettings({
        breakfastTime: data.mealTimes.breakfast,
        lunchTime: data.mealTimes.lunch,
        dinnerTime: data.mealTimes.dinner,
        notificationOffset: data.notificationOffset,
        reminderMode: "time",
        reminderTimes: {
          breakfast: data.reminderTimes?.breakfast || defaultReminderTimes.breakfast,
          lunch: data.reminderTimes?.lunch || defaultReminderTimes.lunch,
          dinner: data.reminderTimes?.dinner || defaultReminderTimes.dinner
        },
        appNotificationsEnabled: false,
        emailNotificationsEnabled: data.emailNotificationsEnabled ?? false
      });
    } catch (err) {
      console.error(err);
      alert("Failed to load settings");
    }
    setLoading(false);
  };

  const checkNotificationPermission = () => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === "granted") {
        alert("✅ App notifications enabled! You'll receive meal reminders while TasteTrail is open.");
        setSettings(prev => ({ ...prev, appNotificationsEnabled: true }));
      } else {
        alert("❌ Notifications denied. App reminders are turned off.");
        setSettings(prev => ({ ...prev, appNotificationsEnabled: false }));
      }
    } else {
      alert("Your browser doesn't support notifications");
    }
  };

  const saveSettings = async () => {
    setSaving(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/settings/meal-times", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          breakfastTime: settings.breakfastTime,
          lunchTime: settings.lunchTime,
          dinnerTime: settings.dinnerTime,
          notificationOffset: settings.notificationOffset,
          reminderMode: "time",
          reminderTimes: settings.reminderTimes,
          appNotificationsEnabled: false,
          emailNotificationsEnabled: settings.emailNotificationsEnabled
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.msg || "Failed to save settings");
        setSaving(false);
        return;
      }

      alert("✅ Settings saved successfully!");
      
      notificationManager.resetInitialization();
    } catch (err) {
      console.error(err);
      alert("Failed to save settings");
    }

    setSaving(false);
  };

  const scheduleAppNotifications = async () => {
    if (notificationPermission !== "granted") return;

    const token = localStorage.getItem("token");
    const res = await fetch("http://localhost:5000/api/meal-plans/my", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const mealPlans = await res.json();

    notificationManager.scheduleAllMealNotifications(
      {
        mealTimes: {
          breakfast: settings.breakfastTime,
          lunch: settings.lunchTime,
          dinner: settings.dinnerTime
        },
        notificationOffset: settings.notificationOffset,
        reminderMode: "time",
        reminderTimes: settings.reminderTimes,
        appNotificationsEnabled: settings.appNotificationsEnabled
      },
      mealPlans
    );
  };

  const handleTimeChange = (mealType, value) => {
    setSettings(prev => ({
      ...prev,
      [`${mealType}Time`]: value
    }));
  };

  const handleReminderTimeChange = (mealType, value) => {
    setSettings(prev => ({
      ...prev,
      reminderTimes: {
        ...prev.reminderTimes,
        [mealType]: value
      }
    }));
  };

  const getReminderHelpText = () => {
    return "Email reminders will use the exact clock times you set above.";
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mt-5 text-center">
          <div className="spinner-border text-warning" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted mt-3">Loading settings...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mt-4 mb-5">
        <button 
          className="btn btn-outline-secondary mb-4"
          onClick={() => navigate("/meal-planner")}
        >
          ← Back to Meal Planner
        </button>

        <div className="settings-header mb-4">
          <h2 className="fw-bold">⚙️ Meal Settings</h2>
          <p className="text-muted">Configure your meal times and notification preferences</p>
        </div>

        <div className="row">
          <div className="col-md-8">
            <div className="settings-card shadow-sm p-4 rounded mb-4">
              <h4 className="fw-bold mb-4">🕐 Meal Times</h4>

              <div className="mb-4">
                <label className="form-label fw-semibold">🥣 Breakfast Time</label>
                <TimeDropdownPicker
                  value={settings.breakfastTime}
                  onChange={(value) => handleTimeChange("breakfast", value)}
                />
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold">🍱 Lunch Time</label>
                <TimeDropdownPicker
                  value={settings.lunchTime}
                  onChange={(value) => handleTimeChange("lunch", value)}
                />
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold">🍽️ Dinner Time</label>
                <TimeDropdownPicker
                  value={settings.dinnerTime}
                  onChange={(value) => handleTimeChange("dinner", value)}
                />
              </div>
            </div>

            <div className="settings-card shadow-sm p-4 rounded mb-4">
              <h4 className="fw-bold mb-4">🔔 Notification Settings</h4>

              <div className="mb-4">
                <label className="form-label fw-semibold">Reminder Timing</label>

                {/*
                  Before-meal reminder mode is hidden for now.
                  To restore it later:
                  1. Set reminderMode from saved data instead of forcing "time".
                  2. Render the reminder-mode buttons.
                  3. Render the notificationOffsets select when reminderMode === "offset".
                */}
                  <div className="reminder-time-grid">
                    <div>
                      <label className="form-label small fw-semibold">🥣 Breakfast Reminder</label>
                      <TimeDropdownPicker
                        value={settings.reminderTimes.breakfast}
                        onChange={(value) => handleReminderTimeChange("breakfast", value)}
                      />
                    </div>
                    <div>
                      <label className="form-label small fw-semibold">🍱 Lunch Reminder</label>
                      <TimeDropdownPicker
                        value={settings.reminderTimes.lunch}
                        onChange={(value) => handleReminderTimeChange("lunch", value)}
                      />
                    </div>
                    <div>
                      <label className="form-label small fw-semibold">🍽️ Dinner Reminder</label>
                      <TimeDropdownPicker
                        value={settings.reminderTimes.dinner}
                        onChange={(value) => handleReminderTimeChange("dinner", value)}
                      />
                    </div>
                  </div>
                <small className="text-muted">{getReminderHelpText()}</small>
              </div>

              <div className="notification-toggle notification-toggle-disabled mb-3">
                <div>
                  <strong>App Notifications</strong>
                  <p className="text-muted small mb-0">Coming soon! reminders will be available in a future update.</p>
                </div>
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    checked={false}
                    disabled
                  />
                </div>
              </div>

              {/* App notification toggle - uncomment this block when browser notifications are ready again.
              <div className="notification-toggle mb-3">
                <div>
                  <strong>App Notifications</strong>
                  <p className="text-muted small mb-0">Browser reminders on this device while TasteTrail is open.</p>
                </div>
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    checked={settings.appNotificationsEnabled}
                    onChange={async (e) => {
                      const enabled = e.target.checked;
                      if (enabled && notificationPermission !== "granted") {
                        await requestNotificationPermission();
                        return;
                      }
                      setSettings(prev => ({ ...prev, appNotificationsEnabled: enabled }));
                    }}
                  />
                </div>
              </div>

              <div className="notification-status mb-4">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <strong>Browser Permission:</strong>
                    <span className={`ms-2 badge ${notificationPermission === "granted" ? "bg-success" : "bg-secondary"}`}>
                      {notificationPermission === "granted" ? "✅ Allowed" : "❌ Not Allowed"}
                    </span>
                  </div>
                  {notificationPermission !== "granted" && (
                    <button className="btn btn-warning btn-sm" onClick={requestNotificationPermission}>
                      Allow App Notifications
                    </button>
                  )}
                </div>
              </div>
              */}

              <div className="notification-toggle mb-4">
                <div>
                  <strong>Email Notifications</strong>
                  <p className="text-muted small mb-0">Meal reminders sent to your registered email address.</p>
                </div>
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    checked={settings.emailNotificationsEnabled}
                    onChange={(e) => setSettings(prev => ({ ...prev, emailNotificationsEnabled: e.target.checked }))}
                  />
                </div>
              </div>

              {/* App notification blocked warning - uncomment with the app notification toggle above.
              {notificationPermission === "denied" && (
                <div className="alert alert-warning">
                  <strong>Notifications Blocked</strong>
                  <p className="mb-0 small">
                    You've blocked notifications. To enable them, click the lock icon in your browser's address bar and allow notifications.
                  </p>
                </div>
              )}
              */}
            </div>

            <button
              className="btn btn-success btn-lg w-100"
              onClick={saveSettings}
              disabled={saving}
            >
              {saving ? "⏳ Saving..." : "💾 Save Settings"}
            </button>
          </div>

          <div className="col-md-4">
            <div className="info-card shadow-sm p-4 rounded">
              <h5 className="fw-bold mb-3">ℹ️ About Notifications</h5>
              <p className="small text-muted">
                Meal notifications help you stay on track with your meal planning. You'll receive timely reminders to prepare your meals.
              </p>
              <hr />
              <h6 className="fw-bold mb-2">How it works:</h6>
              <ul className="small text-muted">
                <li>Set your meal times</li>
                <li>Set exact clock reminder times for breakfast, lunch, and dinner</li>
                <li>App reminders are coming soon; email reminders can be turned on now</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
