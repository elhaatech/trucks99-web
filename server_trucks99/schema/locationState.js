const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { Schema } = mongoose;

const locationStateSchema = new Schema(
  {
    id: { type: String, default: randomUUID, unique: true, index: true },
    uuid: { type: String }, // legacy alias

    // External dataset id (from server/location/states.js / states.json)
    externalId: { type: Number, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },

    // External dataset field: `country_id`
    countryExternalId: { type: Number, required: true, index: true },

    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LocationState', locationStateSchema);

