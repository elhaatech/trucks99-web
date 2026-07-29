'use strict';

const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

/**
 * AI Assistant chat session (distinct from buyer↔seller ChatRoom).
 */
const assistantChatSessionSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => randomUUID(), unique: true, index: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, default: 'New chat', trim: true },
    /** Conversational / sell-flow state + draft listing payload */
    context: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: null },
    messageCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true },
);

assistantChatSessionSchema.index({ userId: 1, updatedAt: -1 });
assistantChatSessionSchema.index({ userId: 1, title: 'text', lastMessage: 'text' });

module.exports = mongoose.model('AssistantChatSession', assistantChatSessionSchema);
