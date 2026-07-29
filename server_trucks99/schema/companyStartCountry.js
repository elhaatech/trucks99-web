const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { Schema } = mongoose;

const companyStartCountrySchema = new Schema(
  {
    id: { type: String, default: randomUUID, unique: true, index: true },
    uuid: { type: String }, // legacy alias

    // Preferred location fields (no `start_` prefix)
    city: { type: String, index: true },
    state: { type: String, index: true },
    country: { type: String, index: true },

    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CompanyStartCountry', companyStartCountrySchema);

