'use strict';

const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

/**
 * AI Assistant message (distinct from buyer↔seller ChatMessage).
 */
const assistantChatMessageSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => randomUUID(), unique: true, index: true },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssistantChatSession',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: { type: String, required: true },
    /** Structured UI extras: quick replies, tables, actions */
    meta: {
      quickReplies: [
        {
          label: { type: String },
          value: { type: String },
        },
      ],
      // Nested `type` must use `{ type: String }` or Mongoose treats the whole
      // subdoc as a String path (classic cast error on actions arrays).
      actions: [
        {
          type: { type: String },
          label: { type: String },
          payload: { type: mongoose.Schema.Types.Mixed },
        },
      ],
      data: { type: mongoose.Schema.Types.Mixed },
      intent: { type: String },
    },
  },
  { timestamps: true },
);

assistantChatMessageSchema.index({ sessionId: 1, createdAt: 1 });

module.exports = mongoose.model('AssistantChatMessage', assistantChatMessageSchema);
