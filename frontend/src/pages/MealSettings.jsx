import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./MealSettings.css";

export default function MealSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    breakfastTime: "08:00",
    lunchTime: "13:00",
    dinnerTime: "20:00",
    notificationOffset: 30,
    notificationsEnabled: false
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
        notificationsEnabled: data.notificationsEnabled
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
        alert("✅ Notifications enabled! You'll receive meal reminders.");
        setSettings(prev => ({ ...prev, notificationsEnabled: true }));
      } else {
        alert("❌ Notifications denied. You won't receive meal reminders.");
        setSettings(prev => ({ ...prev, notificationsEnabled: false }));
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
          notificationsEnabled: settings.notificationsEnabled
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.msg || "Failed to save settings");
        setSaving(false);
        return;
      }

      alert("✅ Settings saved successfully!");
      
      // Schedule notifications if enabled
      if (settings.notificationsEnabled && notificationPermission === "granted") {
        scheduleNotifications();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save settings");
    }

    setSaving(false);
  };

  const scheduleNotifications = () => {
    // This will be handled by the NotificationManager service
    // For now, just show a confirmation
    console.log("Notifications scheduled for:", settings);
  };

  const handleTimeChange = (mealType, value) => {
    setSettings(prev => ({
      ...prev,
      [`${mealType}Time`]: value
    }));
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
                <label className="form-label fw-semibold">🍳 Breakfast Time</label>
                <input
                  type="time"
                  className="form-control"
                  value={settings.breakfastTime}
                  onChange={(e) => handleTimeChange("breakfast", e.target.value)}
                />
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold">🍱 Lunch Time</label>
                <input
                  type="time"
                  className="form-control"
                  value={settings.lunchTime}
                  onChange={(e) => handleTimeChange("lunch", e.target.value)}
                />
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold">🍽️ Dinner Time</label>
                <input
                  type="time"
                  className="form-control"
                  value={settings.dinnerTime}
                  onChange={(e) => handleTimeChange("dinner", e.target.value)}
                />
              </div>
            </div>

            <div className="settings-card shadow-sm p-4 rounded mb-4">
              <h4 className="fw-bold mb-4">🔔 Notification Settings</h4>

              <div className="mb-4">
                <label className="form-label fw-semibold">Notification Timing</label>
                <select
                  className="form-select"
                  value={settings.notificationOffset}
                  onChange={(e) => setSettings(prev => ({ ...prev, notificationOffset: parseInt(e.target.value) }))}
                >
                  <option value={30}>30 minutes before meal</option>
                  <option value={60}>1 hour before meal</option>
                </select>
                <small className="text-muted">
                  You'll receive a reminder {settings.notificationOffset} minutes before each meal
                </small>
              </div>

              <div className="notification-status mb-4">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <strong>Notification Status:</strong>
                    <span className={`ms-2 badge ${notificationPermission === "granted" ? "bg-success" : "bg-secondary"}`}>
                      {notificationPermission === "granted" ? "✅ Enabled" : "❌ Disabled"}
                    </span>
                  </div>
                  {notificationPermission !== "granted" && (
                    <button
                      className="btn btn-warning btn-sm"
                      onClick={requestNotificationPermission}
                    >
                      Enable Notifications
                    </button>
                  )}
                </div>
              </div>

              {notificationPermission === "denied" && (
                <div className="alert alert-warning">
                  <strong>Notifications Blocked</strong>
                  <p className="mb-0 small">
                    You've blocked notifications. To enable them, click the lock icon in your browser's address bar and allow notifications.
                  </p>
                </div>
              )}
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
                <li>Choose notification timing (30 min or 1 hour before)</li>
                <li>Enable browser notifications</li>
                <li>Receive reminders automatically</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
