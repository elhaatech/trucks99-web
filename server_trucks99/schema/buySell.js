const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { Schema } = mongoose;

const buySellSchema = new Schema({
  id: { type: String, default: randomUUID, unique: true, index: true },
  name: { type: String, required: true },
  description: String,
  contactEmail: String,
  contactMobile: String,
  address: String,
  type: {
    type: String,
    enum: ['buy', 'sell', 'vendor'],
    default: 'buy',
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('BuySell', buySellSchema);
