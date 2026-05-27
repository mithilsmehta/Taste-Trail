const mongoose = require("mongoose");

const visionScanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  ingredients: {
    type: [String],
    default: []
  },
  rejectedItems: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model("VisionScan", visionScanSchema);
