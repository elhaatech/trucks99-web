const mongoose = require("mongoose");

const buySellFeaturedVehicleSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BuySellProduct",
      required: true,
      index: true,
    },
    productUuid: { type: String, default: null, index: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    packageId: { type: String, required: true, index: true },
    packageName: { type: String, required: true, trim: true },
    packageType: { type: String, default: "", lowercase: true },
    price: { type: Number, required: true, min: 0 },
    durationDays: { type: Number, required: true, min: 0 },
    paymentId: { type: String, default: null },
    orderId: { type: String, default: null },
    source: {
      type: String,
      enum: ["paid", "free_plan"],
      default: "paid",
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "expired", "cancelled", "rejected"],
      default: "active",
      index: true,
    },
    expiresAt: { type: Date, default: null, index: true },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: { type: Date, default: null },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "" },
  },
  { timestamps: true },
);

buySellFeaturedVehicleSchema.index(
  { paymentId: 1 },
  {
    unique: true,
    partialFilterExpression: { paymentId: { $type: "string", $ne: "" } },
  },
);
buySellFeaturedVehicleSchema.index(
  { orderId: 1 },
  {
    unique: true,
    partialFilterExpression: { orderId: { $type: "string", $ne: "" } },
  },
);
buySellFeaturedVehicleSchema.index({ productId: 1, status: 1, source: 1 });
buySellFeaturedVehicleSchema.index(
  { productId: 1 },
  {
    unique: true,
    name: "uniq_pending_free_plan_per_product",
    partialFilterExpression: { source: "free_plan", status: "pending" },
  },
);

module.exports = mongoose.model(
  "BuySellFeaturedVehicle",
  buySellFeaturedVehicleSchema,
);
