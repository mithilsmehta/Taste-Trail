const mongoose = require("mongoose");

const googlePlayNotificationSchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true, index: true },
  notificationType: { type: Number, default: null },
  purchaseToken: { type: String, default: null },
  subscriptionId: { type: String, default: null },
  status: {
    type: String,
    enum: ["processed", "ignored"],
    required: true
  },
  processedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model("GooglePlayNotification", googlePlayNotificationSchema);
