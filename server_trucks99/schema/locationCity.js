const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { Schema } = mongoose;

const locationCitySchema = new Schema(
  {
    id: { type: String, default: randomUUID, unique: true, index: true },
    uuid: { type: String }, // legacy alias

    externalId: { type: Number, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },

    // External dataset field: `state_id`
    stateExternalId: { type: Number, required: true, index: true },

    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LocationCity', locationCitySchema);

