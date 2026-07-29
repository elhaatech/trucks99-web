const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const buySellCartSchema = new mongoose.Schema(
  {
    id: { type: String, default: randomUUID, unique: true, index: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BuySellProduct",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

buySellCartSchema.index({ userId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model("BuySellCart", buySellCartSchema);
