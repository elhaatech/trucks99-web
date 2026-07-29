const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { Schema } = mongoose;

/**
 * Delivery history for every notification attempt (all channels).
 */
const notificationLogSchema = new Schema(
  {
    id: { type: String, default: randomUUID, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    event: { type: String, required: true, index: true },
    channel: {
      type: String,
      enum: ['in_app', 'whatsapp', 'sms', 'email', 'push'],
      required: true,
      index: true,
    },
    title: { type: String, default: '' },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'skipped'],
      default: 'pending',
      index: true,
    },
    deliveryStatus: { type: String, default: null },
    errorMessage: { type: String, default: null },
    providerMessageId: { type: String, default: null },
    dedupeKey: { type: String, default: null, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationLogSchema.index({ userId: 1, event: 1, dedupeKey: 1, createdAt: -1 });

module.exports = mongoose.model('NotificationLog', notificationLogSchema);
