const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { Schema } = mongoose;

const incomeExpenseSchema = new Schema(
  {
    id: { type: String, default: randomUUID, unique: true, index: true },
    type: { type: String, required: true, enum: ['income', 'expense'] },
    categoryId: { type: Schema.Types.ObjectId, ref: 'IncomeExpenseCategory', required: true },
    remarks: { type: String, default: '', trim: true },
    amount: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    userId:   { type: Schema.Types.ObjectId, ref: 'User' },

  },
  { timestamps: true }
);

incomeExpenseSchema.index({ type: 1, status: 1, createdAt: -1 });
incomeExpenseSchema.index({ userId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('IncomeExpense', incomeExpenseSchema);
