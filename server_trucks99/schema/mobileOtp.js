const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { Schema } = mongoose;

const mobileOtpSchema = new Schema(
  {
    id: { type: String, default: () => randomUUID(), unique: true, index: true },
    mobile: { type: String, required: true, unique: true, index: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0 },
    resendCount: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

mobileOtpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('MobileOtp', mobileOtpSchema);
