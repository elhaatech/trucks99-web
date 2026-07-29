'use strict';

/** Human-readable label for a buy/sell product (no duplicate logic across handlers). */
function productLabel(product) {
  if (!product) return 'Product';
  if (product.bsNumber) return String(product.bsNumber);
  if (product.description) {
    const d = String(product.description).trim();
    if (d) return d.length > 60 ? `${d.slice(0, 57)}...` : d;
  }
  if (product.id) return `Product ${product.id}`;
  if (product._id) return `Product ${product._id}`;
  return 'Product';
}

module.exports = { productLabel };
