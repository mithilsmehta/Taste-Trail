const mongoose = require("mongoose");

const userSettingsSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    unique: true,
    index: true 
  },
  mealTimes: {
    breakfast: { 
      type: String, 
      default: "08:00",
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    lunch: { 
      type: String, 
      default: "13:00",
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    dinner: { 
      type: String, 
      default: "20:00",
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    }
  },
  notificationOffset: { 
    type: Number, 
    enum: [30, 60], 
    default: 30 
  },
  notificationsEnabled: { 
    type: Boolean, 
    default: false 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update timestamp on save
userSettingsSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("UserSettings", userSettingsSchema);
