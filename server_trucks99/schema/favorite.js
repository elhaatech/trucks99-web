const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

const favoriteSchema = new mongoose.Schema(
  {
    id: { type: String, default: randomUUID, unique: true, index: true },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    entity: {
      type: String,
      required: true, // ex: buySell, driver, loader
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    is_favorite: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Favorite', favoriteSchema);