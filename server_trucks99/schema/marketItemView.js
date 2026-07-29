const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Tracks market item views per user to prevent duplicate increments within 24 hours.
 */
const marketItemViewSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'BuySellProduct',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    viewedAt: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
  },
  { timestamps: true },
);

marketItemViewSchema.index({ productId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('MarketItemView', marketItemViewSchema);
