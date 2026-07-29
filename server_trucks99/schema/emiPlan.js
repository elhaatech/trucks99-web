const mongoose = require("mongoose");
const { randomUUID } = require("crypto");
const { Schema } = mongoose;

const emiPlanSchema = new Schema(
  {
    id: { type: String, default: randomUUID, unique: true, index: true },
    userId: { type: Schema.Types.Mixed, required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: "BuySellProduct", required: true, index: true },
    sellerId: { type: Schema.Types.Mixed, required: true, index: true },
    productPrice: { type: Number, required: true, min: 0 },
    downPayment: { type: Number, required: true, min: 0, default: 0 },
    loanAmount: { type: Number, required: true, min: 0 },
    interestRate: { type: Number, required: true, min: 0 },
    tenure: { type: Number, required: true, min: 1 },
    monthlyEMI: { type: Number, required: true, min: 0 },
    totalInterest: { type: Number, required: true, min: 0, default: 0 },
    totalPayable: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, min: 0, default: 0 },
    remainingAmount: { type: Number, required: true, min: 0 },
    installmentsPaid: { type: Number, required: true, min: 0, default: 0 },
    nextDueDate: { type: Date, default: null },
    paymentType: {
      type: String,
      enum: ["full", "emi"],
      default: "emi",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "completed"],
      default: "pending",
      index: true,
    },
    emiStatus: {
      type: String,
      enum: ["pending", "active", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
    initialPaymentMode: {
      type: String,
      enum: ["down_payment", "first_emi"],
      default: "down_payment",
    },
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    paymentHistory: [
      {
        installmentNo: { type: Number, default: 0 },
        amount: { type: Number, required: true },
        razorpayOrderId: { type: String, default: null },
        razorpayPaymentId: { type: String, default: null },
        paidAt: { type: Date, default: () => new Date() },
        label: { type: String, default: "" },
      },
    ],
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: Schema.Types.Mixed, default: null },
    cancelReason: { type: String, default: "" },
  },
  { timestamps: true },
);

emiPlanSchema.index({ userId: 1, emiStatus: 1, createdAt: -1 });
emiPlanSchema.index({ productId: 1, emiStatus: 1 });

module.exports = mongoose.model("EmiPlan", emiPlanSchema);
