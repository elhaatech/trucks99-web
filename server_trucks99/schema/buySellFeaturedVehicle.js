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
    durationDays: { type: Number, required: true, min: 1 },
    paymentId: { type: String, default: null },
    orderId: { type: String, default: null },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
      index: true,
    },
    expiresAt: { type: Date, required: true, index: true },
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

module.exports = mongoose.model(
  "BuySellFeaturedVehicle",
  buySellFeaturedVehicleSchema,
);
