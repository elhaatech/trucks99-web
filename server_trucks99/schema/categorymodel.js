const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  id: { type: String },
  uuid: { type: String },
  category_name: { type: String, required: true, trim: true },
  status: { type: String, default: 'active' },
  created_by: { type: String, default: null },
  updated_by: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);