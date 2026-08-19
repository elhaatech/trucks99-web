const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * One document per genuine product-detail view.
 * Used for marketplace analytics (views over time, most-viewed, unique viewers).
 * Duplicate views from the same user or guest session are deduped in the
 * increment handler (24h window) — this collection is append-only.
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
      default: null,
      index: true,
    },
    sessionId: {
      type: String,
      default: null,
      trim: true,
      maxlength: 64,
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

marketItemViewSchema.index({ viewedAt: -1 });
marketItemViewSchema.index({ productId: 1, viewedAt: -1 });
marketItemViewSchema.index({ userId: 1, viewedAt: -1 });
marketItemViewSchema.index({ productId: 1, userId: 1, viewedAt: -1 });
marketItemViewSchema.index({ productId: 1, sessionId: 1, viewedAt: -1 });

async function ensureMarketItemViewIndexes() {
  const coll = mongoose.model('MarketItemView').collection;
  try {
    const indexes = await coll.indexes();
    const uniqueDedupe = indexes.find(
      (idx) => idx.unique && idx.key && idx.key.productId === 1 && idx.key.userId === 1,
    );
    if (uniqueDedupe) {
      await coll.dropIndex(uniqueDedupe.name);
    }
  } catch (err) {
    if (err.code !== 27 && err.codeName !== 'IndexNotFound') {
      console.error('[MarketItemView] Failed to drop legacy unique index:', err.message);
    }
  }
  try {
    await mongoose.model('MarketItemView').createIndexes();
  } catch (err) {
    console.error('[MarketItemView] Failed to create indexes:', err.message);
  }
}

module.exports = mongoose.model('MarketItemView', marketItemViewSchema);
module.exports.ensureMarketItemViewIndexes = ensureMarketItemViewIndexes;
