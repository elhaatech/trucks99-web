const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { Schema } = mongoose;

const otpSchema = new Schema({
  id: { type: String, default: randomUUID, unique: true, index: true },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  otp: {
    type: String,
    required: true,
  },
  channel: {
    type: String,
    enum: ['sms', 'email'],
    required: true,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
});

// Auto-delete OTP documents after 15 minutes (optional; we also check expiryDate in code)
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 900 });

module.exports = mongoose.model('Otp', otpSchema);
