const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { Schema } = mongoose;

const truckBitRecordSchema = new Schema({
  id: { type: String, default: randomUUID, unique: true, index: true },
  truckId: { type: Schema.Types.ObjectId, ref: 'Truck', required: true, index: true },
  loadId: { type: Schema.Types.ObjectId, ref: 'Load', index: true },
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
  offerType: {
  type: String,
  enum: ['my_offers', 'received_offers']
} 
}, { timestamps: true });

truckBitRecordSchema.index({ status: 1, createdAt: -1 });
truckBitRecordSchema.index({ truckId: 1, status: 1 });

module.exports = mongoose.model('TruckBitRecord', truckBitRecordSchema);
