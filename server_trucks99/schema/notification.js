const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { Schema } = mongoose;

const notificationSchema = new Schema({
  id: { type: String, default: randomUUID, unique: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  event: { type: String, default: 'general', index: true },
  type: { type: String, default: 'general', index: true },
  loadId: { type: Schema.Types.ObjectId, ref: 'Load' },
  productId: { type: Schema.Types.ObjectId, ref: 'BuySellProduct' },
  postId: { type: String },
  requestId: { type: String },
  postType: { type: String },
  metadata: { type: Schema.Types.Mixed, default: {} },
  /** `user` = user portal; `admin` = admin portal. */
  audience: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
  read: { type: Boolean, default: false },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
