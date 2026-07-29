const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema({
  id: { type: String },
  uuid: { type: String },
  category_id: { type: String, required: true },
  sub_category_name: { type: String, required: true, trim: true },
  status: { type: String, default: 'active' },
  created_by: { type: String, default: null },
  updated_by: { type: String, default: null },
}, { timestamps: true });

subCategorySchema.index({ category_id: 1, status: 1, sub_category_name: 1 });

module.exports = mongoose.model('SubCategory', subCategorySchema);