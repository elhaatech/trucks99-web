const mongoose = require("mongoose");

const fcmTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true, // ✅ prevents duplicates
  },
  device: String,
  platform: String,
  isActive: {
    type: Boolean,
    default: true,
  },
  lastUsed: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("FcmToken", fcmTokenSchema);