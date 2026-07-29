const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { Schema } = mongoose;

const locationCountrySchema = new Schema(
  {
    // API-friendly ID (matches the project's `toResponse()` convention)
    id: { type: String, default: randomUUID, unique: true, index: true },
    uuid: { type: String }, // legacy alias

    // External dataset id (from server/location/countries.js)
    externalId: { type: Number, required: true, unique: true, index: true },

    sortname: { type: String, default: '' },
    name: { type: String, required: true, index: true },

    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LocationCountry', locationCountrySchema);

