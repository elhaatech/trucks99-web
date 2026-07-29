const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { Schema } = mongoose;

const notificationTemplateSchema = new Schema(
  {
    id: { type: String, default: () => randomUUID(), unique: true, index: true },
    event: { type: String, required: true, unique: true, index: true },
    label: { type: String, required: true },
    description: { type: String, default: '' },
    enabled: { type: Boolean, default: true },
    channels: {
      in_app: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      email: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
    },
    templates: {
      in_app: {
        title: { type: String, default: '' },
        body: { type: String, default: '' },
      },
      whatsapp: { body: { type: String, default: '' } },
      sms: { body: { type: String, default: '' } },
      email: {
        subject: { type: String, default: '' },
        body: { type: String, default: '' },
      },
      push: {
        title: { type: String, default: '' },
        body: { type: String, default: '' },
      },
    },
    placeholders: [{ type: String }],
  },
  { timestamps: true },
);

module.exports = mongoose.model('NotificationTemplate', notificationTemplateSchema);
