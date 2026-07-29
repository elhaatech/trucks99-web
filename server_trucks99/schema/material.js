const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { Schema } = mongoose;

const materialSchema = new Schema(
  {
    id: { type: String, default: randomUUID, unique: true, index: true },
    materials_type: { type: String, required: true },
    subcommodity: { type: String, default: '' },
    commodity: { type: String, default: '' },
    is_insurance_available: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Material', materialSchema);
