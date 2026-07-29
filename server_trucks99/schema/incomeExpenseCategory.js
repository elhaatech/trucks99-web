const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { Schema } = mongoose;

const incomeExpenseCategorySchema = new Schema(
  {
    id: { type: String, default: randomUUID, unique: true, index: true },
    type: { type: String, required: true, enum: ['income', 'expense'] },
    categoryName: { type: String, required: true, trim: true },
    status: { type: String, required: true, enum: ['Active', 'Inactive'], default: 'Active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('IncomeExpenseCategory', incomeExpenseCategorySchema);
