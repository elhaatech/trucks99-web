const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { Schema } = mongoose;

const loadBitRecordSchema = new Schema({
  id: { type: String, default: randomUUID, unique: true, index: true },
  loadId: { type: Schema.Types.ObjectId, ref: 'Load', required: true, index: true },
  bit: { type: Number, required: true },
  bitReason: String,
  status: {
    type: String,
    enum: ['accept', 'reject', 'pending'],
    default: 'pending',
  },
  offerType: {
  type: String,
  enum: ['my_offers', 'received_offers']
},
truckId: { type: Schema.Types.ObjectId, ref: 'Truck' },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  userEmail: String,
}, { timestamps: true });

loadBitRecordSchema.index({ status: 1, createdAt: -1 });
loadBitRecordSchema.index({ loadId: 1, status: 1 });

module.exports = mongoose.model('LoadBitRecord', loadBitRecordSchema);
