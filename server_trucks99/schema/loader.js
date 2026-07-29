const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { Schema } = mongoose;

const loaderSchema = new Schema({
  id: { type: String, default: randomUUID, unique: true, index: true },
  name: { type: String, required: true },
  description: String,
  contactEmail: String,
  contactMobile: String,
  company: String,
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Loader', loaderSchema);
