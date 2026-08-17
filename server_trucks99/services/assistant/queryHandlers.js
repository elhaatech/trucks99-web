'use strict';

const BuySellProduct = require('../../schema/buysellProduct');
const BuySellFeaturedVehicle = require('../../schema/buySellFeaturedVehicle');
const Category = require('../../schema/categorymodel');
const { liveFeaturedPlacementQuery } = require('../buySellFeaturedVehicleService');

function formatInr(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '—';
  return `₹${num.toLocaleString('en-IN')}`;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function productLine(p) {
  const cat =
    p.category_id && typeof p.category_id === 'object'
      ? p.category_id.category_name
      : '';
  const brand = p.listing_highlights?.brand || '';
  const title = [brand, cat, p.bsNumber].filter(Boolean).join(' · ') || p.id || String(p._id);
  return `- **${title}** — ${formatInr(p.price)} · \`${p.status}\``;
}

function tableFromProducts(products) {
  if (!products.length) return '_No matching vehicles._';
  const header = '| Vehicle | Price | Status |\n|---|---:|---|';
  const rows = products.slice(0, 15).map((p) => {
    const cat =
      p.category_id && typeof p.category_id === 'object'
        ? p.category_id.category_name
        : '—';
    const brand = p.listing_highlights?.brand || '';
    const name = [brand, cat, p.bsNumber].filter(Boolean).join(' ') || String(p._id).slice(-6);
    return `| ${name} | ${formatInr(p.price)} | ${p.status} |`;
  });
  return [header, ...rows].join('\n');
}

async function loadUserProducts(userId, extraFilter = {}) {
  return BuySellProduct.find({ userid: userId, ...extraFilter })
    .populate('category_id', 'category_name')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
}

/**
 * Handle smart business questions using existing marketplace data.
 */
async function handleBusinessQuery(user, rawText) {
  const userId = user._id;
  const text = String(rawText || '').trim();
  const q = text.toLowerCase();

  // Counts
  if (/how many.*(vehicle|listing|product)/i.test(q) || /total (vehicles|listings)/i.test(q)) {
    const total = await BuySellProduct.countDocuments({ userid: userId });
    return {
      content: `You currently have **${total}** vehicle listing${total === 1 ? '' : 's'}.`,
      intent: 'count_total',
      quickReplies: [
        { label: 'Active listings', value: 'How many active listings?' },
        { label: 'Sold vehicles', value: 'Show my sold vehicles' },
        { label: 'Create listing', value: 'I want to sell my truck' },
      ],
    };
  }

  if (/active listing/i.test(q)) {
    const total = await BuySellProduct.countDocuments({ userid: userId, status: 'active' });
    const list = await loadUserProducts(userId, { status: 'active' });
    return {
      content: `You have **${total}** active listing${total === 1 ? '' : 's'}.\n\n${tableFromProducts(list)}`,
      intent: 'count_active',
      data: { count: total, products: list.slice(0, 15) },
    };
  }

  if (/pending/i.test(q)) {
    const list = await loadUserProducts(userId, { status: 'pending' });
    return {
      content: `**Pending approval** listings (${list.length}):\n\n${tableFromProducts(list)}`,
      intent: 'list_pending',
      data: { products: list },
    };
  }

  if (/rejected/i.test(q)) {
    const list = await loadUserProducts(userId, { status: 'rejected' });
    return {
      content: `**Rejected** listings (${list.length}):\n\n${tableFromProducts(list)}`,
      intent: 'list_rejected',
      data: { products: list },
    };
  }

  if (/sold/i.test(q)) {
    const list = await loadUserProducts(userId, { status: 'sold' });
    return {
      content: `**Sold** vehicles (${list.length}):\n\n${tableFromProducts(list)}`,
      intent: 'list_sold',
      data: { products: list },
    };
  }

  if (/draft/i.test(q)) {
    const list = await loadUserProducts(userId, { status: 'draft' });
    return {
      content: `**Draft** listings (${list.length}):\n\n${tableFromProducts(list)}`,
      intent: 'list_draft',
      data: { products: list },
    };
  }

  if (/featured/i.test(q)) {
    const featured = await BuySellFeaturedVehicle.find({
      userId,
      ...liveFeaturedPlacementQuery(new Date()),
    })
      .populate({
        path: 'productId',
        populate: { path: 'category_id', select: 'category_name' },
      })
      .limit(30)
      .lean()
      .catch(() => []);
    const products = featured.map((f) => f.productId).filter(Boolean);
    return {
      content: `You have **${products.length}** active featured vehicle${products.length === 1 ? '' : 's'}.\n\n${tableFromProducts(products)}`,
      intent: 'list_featured',
      quickReplies: [
        { label: 'Feature a vehicle', value: 'How do I feature a vehicle?' },
      ],
      data: { products },
    };
  }

  if (/expired/i.test(q)) {
    const featured = await BuySellFeaturedVehicle.find({
      userId,
      status: 'expired',
    })
      .populate('productId')
      .limit(30)
      .lean()
      .catch(() => []);
    const products = featured.map((f) => f.productId).filter(Boolean);
    return {
      content: `**Expired** featured placements: **${products.length}**.\n\n${tableFromProducts(products)}`,
      intent: 'list_expired',
    };
  }

  if (/highest price|most expensive/i.test(q)) {
    const top = await BuySellProduct.findOne({ userid: userId })
      .sort({ price: -1 })
      .populate('category_id', 'category_name')
      .lean();
    if (!top) {
      return { content: 'You have no listings yet.', intent: 'highest_price' };
    }
    return {
      content: `Your highest-priced listing:\n\n${productLine(top)}\n\nPrice: **${formatInr(top.price)}**`,
      intent: 'highest_price',
      data: { product: top },
    };
  }

  if (/today|posted today/i.test(q)) {
    const list = await loadUserProducts(userId, { createdAt: { $gte: startOfToday() } });
    return {
      content: `Vehicles you posted **today** (${list.length}):\n\n${tableFromProducts(list)}`,
      intent: 'list_today',
      data: { products: list },
    };
  }

  if (/which category.*(most|more)|most listings/i.test(q)) {
    const rows = await BuySellProduct.aggregate([
      { $match: { userid: userId } },
      { $group: { _id: '$category_id', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);
    if (!rows.length) {
      return { content: 'You have no listings yet.', intent: 'category_stats' };
    }
    const ids = rows.map((r) => r._id).filter(Boolean);
    const cats = await Category.find({ _id: { $in: ids } }).select('category_name').lean();
    const nameById = Object.fromEntries(cats.map((c) => [String(c._id), c.category_name]));
    const lines = rows.map(
      (r) => `- **${nameById[String(r._id)] || 'Unknown'}**: ${r.count}`,
    );
    return {
      content: `Categories with the most of your listings:\n\n${lines.join('\n')}`,
      intent: 'category_stats',
    };
  }

  // Category filters: trucks / cars
  const catOnly = q.match(/show only (\w+)/i) || q.match(/only (trucks?|cars?|buses?|trailers?)/i);
  if (catOnly) {
    const name = (catOnly[1] || '').replace(/s$/, '');
    const cat = await Category.findOne({
      category_name: { $regex: new RegExp(name, 'i') },
    }).lean();
    if (cat) {
      const list = await loadUserProducts(userId, { category_id: cat._id });
      return {
        content: `Your **${cat.category_name}** listings (${list.length}):\n\n${tableFromProducts(list)}`,
        intent: 'filter_category',
        data: { products: list },
      };
    }
  }

  // Price below
  const priceBelow = q.match(/price below\s*₹?\s*([\d.]+)\s*(lakh|lakhs|l)?/i)
    || q.match(/below\s*₹?\s*([\d.]+)\s*(lakh|lakhs|l)?/i);
  if (priceBelow) {
    let max = Number(priceBelow[1]);
    if (priceBelow[2]) max *= 100000;
    const list = await loadUserProducts(userId, { price: { $lte: max } });
    return {
      content: `Listings priced **below ${formatInr(max)}** (${list.length}):\n\n${tableFromProducts(list)}`,
      intent: 'filter_price',
      data: { products: list },
    };
  }

  // Location search
  const loc = q.match(/location\s+([a-zA-Z\s]+)/i) || q.match(/in\s+([a-zA-Z]+)$/i);
  if (/location|chennai|bangalore|hyderabad|mumbai|delhi/i.test(q)) {
    const place = (loc && loc[1] ? loc[1] : q.match(/(chennai|bangalore|hyderabad|mumbai|delhi)/i)?.[1] || '').trim();
    if (place) {
      const list = await BuySellProduct.find({
        userid: userId,
        address: { $regex: new RegExp(place, 'i') },
      })
        .populate('category_id', 'category_name')
        .sort({ createdAt: -1 })
        .limit(30)
        .lean();
      return {
        content: `Listings matching location **${place}** (${list.length}):\n\n${tableFromProducts(list)}`,
        intent: 'search_location',
        data: { products: list },
      };
    }
  }

  // Generic search: "Search Tata" / brand / year
  const searchMatch = q.match(/^search\s+(.+)$/i) || q.match(/find\s+(.+)$/i);
  if (searchMatch || /tata|ashok|volvo|eicher|bharat|202\d\s*model/i.test(q)) {
    const term = (searchMatch ? searchMatch[1] : text).trim();
    const all = await loadUserProducts(userId);
    const filtered = all.filter((p) => {
      const hay = JSON.stringify(p).toLowerCase();
      return hay.includes(term.toLowerCase());
    });
    return {
      content: `Search results for **"${term}"** (${filtered.length}):\n\n${tableFromProducts(filtered)}`,
      intent: 'search',
      data: { products: filtered },
    };
  }

  if (/package|subscription/i.test(q)) {
    return {
      content:
        'You can manage featured packages from **Feature Your Vehicle**.\n\nI can also show your featured listings — ask: *Show my featured vehicles*.',
      intent: 'packages_info',
      quickReplies: [
        { label: 'My featured vehicles', value: 'Show my featured vehicles' },
      ],
      actions: [
        { type: 'navigate', label: 'Open featured plans', payload: { href: '/featured' } },
      ],
    };
  }

  if (/feature a vehicle|how do i feature/i.test(q)) {
    return {
      content:
        'To feature a vehicle:\n\n1. Open **My Listings**\n2. Choose an active vehicle\n3. Select a **Feature Your Vehicle** package and complete payment\n\nI can take you there.',
      intent: 'feature_help',
      actions: [
        { type: 'navigate', label: 'Feature vehicle', payload: { href: '/featured' } },
      ],
    };
  }

  return null;
}

module.exports = {
  handleBusinessQuery,
  tableFromProducts,
};
