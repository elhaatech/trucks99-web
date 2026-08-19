const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const chatRoomSchema = new mongoose.Schema(
  {
    id: { type: String, default: randomUUID, unique: true, index: true },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BuySellProduct",
      required: true,
      index: true,
    },

    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date, default: null },

    // Per-participant read markers, used for unread counts.
    sellerLastReadAt: { type: Date, default: null },
    buyerLastReadAt: { type: Date, default: null },

    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },
  },
  { timestamps: true },
);

// Prevents duplicate rooms for the same buyer/seller/product combo.
chatRoomSchema.index({ productId: 1, sellerId: 1, buyerId: 1 }, { unique: true });
chatRoomSchema.index({ createdAt: -1 });
chatRoomSchema.index({ buyerId: 1, createdAt: -1 });

module.exports = mongoose.model("ChatRoom", chatRoomSchema);