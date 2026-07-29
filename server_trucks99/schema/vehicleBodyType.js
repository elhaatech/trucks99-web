const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { Schema } = mongoose;

const vehicleBodyTypeSchema = new Schema(
  {
    id: { type: String, default: randomUUID, unique: true, index: true },
    uuid: { type: String },
    vehicle_name: { type: String, required: true },
    image: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },

    // Wheel variants
    has_wheel_variants: { type: String, enum: ['Yes', 'No'], default: 'No' },
    available_wheels_count: { type: [Number], default: [] },

    // Length variants
    has_length_variants: { type: String, enum: ['Yes', 'No'], default: 'No' },
    available_lengths: { type: [Number], default: [] },
    available_capacity_lengths: { type: [Number], default: [] },

  },
  { timestamps: true }
);

module.exports = mongoose.model('VehicleBodyType', vehicleBodyTypeSchema);