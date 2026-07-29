const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const chatMessageSchema = new mongoose.Schema(
  {
    id: { type: String, default: randomUUID, unique: true, index: true },

    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true,
      index: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    message: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

chatMessageSchema.index({ roomId: 1, createdAt: 1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);