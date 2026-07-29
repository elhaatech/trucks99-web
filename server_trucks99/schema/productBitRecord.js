'use strict';

const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { Schema } = mongoose;

const productBitRecordSchema = new Schema({
  id: { type: String, default: randomUUID, unique: true, index: true },

  productId: {
    type: Schema.Types.ObjectId,
    ref: 'BuySellProduct', // ✅ FIXED: was 'BuySell', must match mongoose.model('BuySellProduct', ...)
    required: true,
    index: true,
  },

  bit: { type: Number, required: true },
  bitReason: String,

  status: {
    type: String,
    enum: ['accept', 'reject', 'pending'],
    default: 'pending',
  },

  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  userEmail: String,

  /** Set when income/expense transactions are auto-created on offer accept (idempotency). */
  transactionsCreatedAt: { type: Date, default: null },

}, { timestamps: true });

module.exports = mongoose.model('ProductBitRecord', productBitRecordSchema);