'use strict';

/**
 * Marketplace (Buy/Sell) analytics for the admin dashboard.
 * All counts come from existing collections — no mock data.
 */

const mongoose = require('mongoose');
const BuySellProduct = require('../schema/buysellProduct');
const User = require('../schema/user');
const Category = require('../schema/categorymodel');
const MarketItemView = require('../schema/marketItemView');
const Favorite = require('../schema/favorite');
const ProductBitRecord = require('../schema/productBitRecord');
const ChatRoom = require('../schema/chatRoom');
const BuySellFeaturedVehicle = require('../schema/buySellFeaturedVehicle');

const TZ = 'Asia/Kolkata';
const FAVORITE_ENTITY = 'buySell';

/** Live marketplace inventory (listed / in-deal, not draft/rejected/sold). */
const ACTIVE_STATUSES = ['pending', 'accepeted', 'booking'];
/** Offer-accepted — closest real equivalent of "approved". */
const APPROVED_STATUSES = ['accepeted'];
const PENDING_STATUSES = ['pending'];
const REJECTED_STATUSES = ['rejected'];
const SOLD_STATUSES = ['sold'];

const STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending',
  rejected: 'Rejected',
  accepeted: 'Approved',
  accepted: 'Approved',
  active: 'Active',
  inactive: 'Inactive',
  booking: 'Booking',
  purchased: 'Purchased',
  sold: 'Sold',
};

const STATUS_CHART_ORDER = [
  'pending',
  'accepeted',
  'booking',
  'purchased',
  'sold',
  'rejected',
  'draft',
  'active',
  'inactive',
];

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function percentChange(current, previous) {
  const curr = safeNumber(current);
  const prev = safeNumber(previous);
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function parseDateInput(value, endOfDay = false) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function objectIdFromDate(date) {
  return mongoose.Types.ObjectId.createFromTime(Math.floor(date.getTime() / 1000));
}

function paginate(body = {}) {
  const page = Math.max(1, parseInt(body.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(body.limit, 10) || 8));
  return { page, limit, skip: (page - 1) * limit };
}

function toObjectId(value) {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  const str = String(value).trim();
  if (/^[a-fA-F0-9]{24}$/.test(str)) return new mongoose.Types.ObjectId(str);
  return null;
}

/**
 * Resolve dashboard date range.
 * period: today | yesterday | last_7_days | last_30_days | last_3_months |
 *         last_6_months | this_year | custom | all
 * Views-trend aliases: 7d | 30d | 3m | 6m | 1y
 */
function resolveMarketplaceRange(body = {}) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const raw = String(body.period || body.range || 'last_30_days').toLowerCase().trim();
  const dateFrom = parseDateInput(body.dateFrom);
  const dateTo = parseDateInput(body.dateTo, true);

  const presets = {
    today: { start: todayStart, end: todayEnd, key: 'today' },
    yesterday: {
      start: startOfDay(addDays(todayStart, -1)),
      end: endOfDay(addDays(todayStart, -1)),
      key: 'yesterday',
    },
    last_7_days: { start: startOfDay(addDays(todayStart, -6)), end: todayEnd, key: 'last_7_days' },
    '7d': { start: startOfDay(addDays(todayStart, -6)), end: todayEnd, key: '7d' },
    last_30_days: { start: startOfDay(addDays(todayStart, -29)), end: todayEnd, key: 'last_30_days' },
    '30d': { start: startOfDay(addDays(todayStart, -29)), end: todayEnd, key: '30d' },
    last_3_months: { start: startOfDay(addDays(todayStart, -89)), end: todayEnd, key: 'last_3_months' },
    '3m': { start: startOfDay(addDays(todayStart, -89)), end: todayEnd, key: '3m' },
    last_6_months: { start: startOfDay(addDays(todayStart, -179)), end: todayEnd, key: 'last_6_months' },
    '6m': { start: startOfDay(addDays(todayStart, -179)), end: todayEnd, key: '6m' },
    this_year: {
      start: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
      end: todayEnd,
      key: 'this_year',
    },
    '1y': { start: startOfDay(addDays(todayStart, -364)), end: todayEnd, key: '1y' },
    all: { start: null, end: null, key: 'all' },
    all_time: { start: null, end: null, key: 'all' },
  };

  if ((raw === 'custom' || dateFrom || dateTo) && (dateFrom || dateTo)) {
    return {
      start: dateFrom || startOfDay(addDays(todayStart, -29)),
      end: dateTo || todayEnd,
      key: 'custom',
    };
  }

  return presets[raw] || presets.last_30_days;
}

function previousPeriodRange(start, end) {
  if (!start || !end) return { start: null, end: null };
  const durationMs = end.getTime() - start.getTime() + 1;
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs + 1);
  return { start: startOfDay(prevStart), end: endOfDay(prevEnd) };
}

function createdAtMatch(start, end) {
  if (!start && !end) return {};
  const createdAt = {};
  if (start) createdAt.$gte = start;
  if (end) createdAt.$lte = end;
  return { createdAt };
}

function viewedAtMatch(start, end) {
  if (!start && !end) return {};
  const viewedAt = {};
  if (start) viewedAt.$gte = start;
  if (end) viewedAt.$lte = end;
  return { viewedAt };
}

function userCreatedMatch(start, end) {
  if (!start && !end) return {};
  const _id = {};
  if (start) _id.$gte = objectIdFromDate(start);
  if (end) _id.$lte = objectIdFromDate(end);
  return { _id };
}

function metricBlock(count, previousCount) {
  const curr = safeNumber(count);
  const prev = safeNumber(previousCount);
  return {
    count: curr,
    previousCount: prev,
    change: curr - prev,
    percentChange: percentChange(curr, prev),
  };
}

function extractBrand(specifications) {
  if (!Array.isArray(specifications)) return '';
  for (const spec of specifications) {
    const name = String(spec?.specification_id?.specification_name || '').toLowerCase().trim();
    if (name === 'brand' || name === 'make') {
      return String(
        spec.specification_value_info?.specification_value_name ||
          spec.specification_value ||
          '',
      ).trim();
    }
  }
  return '';
}

function productDisplayName(doc) {
  const description = String(doc?.description || '').trim();
  if (description) return description.length > 80 ? `${description.slice(0, 77)}…` : description;
  const sub = doc?.subcategory_id?.sub_category_name || '';
  const cat = doc?.category_id?.category_name || '';
  if (sub && cat) return `${sub} · ${cat}`;
  if (sub) return sub;
  if (cat) return cat;
  return doc?.bsNumber || doc?.vehicleId || 'Vehicle';
}

function formatDashboardProduct(doc, extra = {}) {
  if (!doc) return null;
  return {
    id: doc.id || String(doc._id),
    _id: String(doc._id),
    vehicleId: doc.vehicleId || '',
    bsNumber: doc.bsNumber || '',
    name: productDisplayName(doc),
    brand: extractBrand(doc.specifications),
    category: doc.category_id?.category_name || '',
    categoryId: doc.category_id?._id ? String(doc.category_id._id) : doc.category_id ? String(doc.category_id) : '',
    subcategory: doc.subcategory_id?.sub_category_name || '',
    price: safeNumber(doc.price),
    views: safeNumber(extra.views ?? doc.viewCount),
    favorites: extra.favorites != null ? safeNumber(extra.favorites) : undefined,
    offers: extra.offers != null ? safeNumber(extra.offers) : undefined,
    sellerName: doc.userid?.name || doc.created_by || 'Seller',
    sellerId: doc.userid?._id ? String(doc.userid._id) : doc.userid ? String(doc.userid) : '',
    status: doc.status || 'pending',
    createdAt: doc.createdAt || null,
    image: Array.isArray(doc.images) && doc.images[0] ? doc.images[0] : null,
  };
}

async function hydrateProducts(ids) {
  if (!ids.length) return new Map();
  const docs = await BuySellProduct.find({ _id: { $in: ids } })
    .populate('category_id', 'category_name')
    .populate('subcategory_id', 'sub_category_name')
    .populate('userid', 'name company_name')
    .populate('specifications.specification_id', 'specification_name')
    .select(
      'id bsNumber vehicleId category_id subcategory_id userid price description images specifications status viewCount created_by createdAt',
    )
    .lean();
  return new Map(docs.map((d) => [String(d._id), d]));
}

async function countByStatus(match = {}) {
  const rows = await BuySellProduct.aggregate([
    { $match: match },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const map = {};
  rows.forEach(({ _id, count }) => {
    map[String(_id || 'unknown')] = safeNumber(count);
  });
  return map;
}

function sumStatuses(map, keys) {
  return keys.reduce((sum, key) => sum + safeNumber(map[key]), 0);
}

async function countProductsCreated(start, end, extraMatch = {}) {
  return BuySellProduct.countDocuments({ ...extraMatch, ...createdAtMatch(start, end) });
}

async function countSoldInRange(start, end) {
  if (!start && !end) {
    return BuySellProduct.countDocuments({ status: { $in: SOLD_STATUSES } });
  }
  const soldAt = {};
  if (start) soldAt.$gte = start;
  if (end) soldAt.$lte = end;
  return BuySellProduct.countDocuments({
    $or: [{ soldAt }, { status: { $in: SOLD_STATUSES }, ...createdAtMatch(start, end) }],
  });
}

async function getSummary(body = {}) {
  const range = resolveMarketplaceRange(body);
  const prev = previousPeriodRange(range.start, range.end);

  const [
    statusMap,
    totalProducts,
    periodCreated,
    prevCreated,
    periodActive,
    prevActive,
    periodPending,
    prevPending,
    periodApproved,
    prevApproved,
    periodRejected,
    prevRejected,
    soldLifetime,
    periodSold,
    prevSold,
    totalUsers,
    activeUsers,
    periodUsers,
    prevUsers,
    periodActiveUsers,
    prevActiveUsers,
  ] = await Promise.all([
    countByStatus({}),
    BuySellProduct.countDocuments({}),
    countProductsCreated(range.start, range.end),
    countProductsCreated(prev.start, prev.end),
    countProductsCreated(range.start, range.end, { status: { $in: ACTIVE_STATUSES } }),
    countProductsCreated(prev.start, prev.end, { status: { $in: ACTIVE_STATUSES } }),
    countProductsCreated(range.start, range.end, { status: { $in: PENDING_STATUSES } }),
    countProductsCreated(prev.start, prev.end, { status: { $in: PENDING_STATUSES } }),
    countProductsCreated(range.start, range.end, { status: { $in: APPROVED_STATUSES } }),
    countProductsCreated(prev.start, prev.end, { status: { $in: APPROVED_STATUSES } }),
    countProductsCreated(range.start, range.end, { status: { $in: REJECTED_STATUSES } }),
    countProductsCreated(prev.start, prev.end, { status: { $in: REJECTED_STATUSES } }),
    BuySellProduct.countDocuments({ status: { $in: SOLD_STATUSES } }),
    countSoldInRange(range.start, range.end),
    countSoldInRange(prev.start, prev.end),
    User.countDocuments({}),
    User.countDocuments({ status: 'active' }),
    User.countDocuments(userCreatedMatch(range.start, range.end)),
    User.countDocuments(userCreatedMatch(prev.start, prev.end)),
    User.countDocuments({ status: 'active', ...userCreatedMatch(range.start, range.end) }),
    User.countDocuments({ status: 'active', ...userCreatedMatch(prev.start, prev.end) }),
  ]);

  const activeProducts = sumStatuses(statusMap, ACTIVE_STATUSES);
  const pendingProducts = sumStatuses(statusMap, PENDING_STATUSES);
  const approvedProducts = sumStatuses(statusMap, APPROVED_STATUSES);
  const rejectedProducts = sumStatuses(statusMap, REJECTED_STATUSES);

  const changes = {
    totalProducts: metricBlock(periodCreated, prevCreated),
    activeProducts: metricBlock(periodActive, prevActive),
    pendingProducts: metricBlock(periodPending, prevPending),
    approvedProducts: metricBlock(periodApproved, prevApproved),
    rejectedProducts: metricBlock(periodRejected, prevRejected),
    soldProducts: metricBlock(periodApproved, prevApproved),
    totalUsers: metricBlock(periodUsers, prevUsers),
    activeUsers: metricBlock(periodActiveUsers, prevActiveUsers),
  };

  return {
    totalProducts,
    activeProducts,
    pendingProducts,
    approvedProducts,
    rejectedProducts,
    // User portal Sold card uses approved (`accepeted`) listings.
    soldProducts: approvedProducts,
    totalUsers,
    activeUsers,
    changes,
    periodCounts: {
      totalProducts: periodCreated,
      activeProducts: periodActive,
      pendingProducts: periodPending,
      approvedProducts: periodApproved,
      rejectedProducts: periodRejected,
      soldProducts: periodApproved,
      totalUsers: periodUsers,
      activeUsers: periodActiveUsers,
    },
    period: {
      start: range.start,
      end: range.end,
      key: range.key,
    },
  };
}

async function getProductStatus(body = {}) {
  const range = resolveMarketplaceRange(body);
  const match = createdAtMatch(range.start, range.end);
  const [periodMap, lifetimeMap] = await Promise.all([
    countByStatus(match),
    countByStatus({}),
  ]);

  const keys = new Set([...STATUS_CHART_ORDER, ...Object.keys(lifetimeMap), ...Object.keys(periodMap)]);
  const statuses = Array.from(keys)
    .filter((key) => key && key !== 'unknown')
    .sort((a, b) => {
      const ia = STATUS_CHART_ORDER.indexOf(a);
      const ib = STATUS_CHART_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    })
    .map((key) => ({
      key,
      label: STATUS_LABELS[key] || key,
      count: safeNumber(range.start ? periodMap[key] : lifetimeMap[key]),
      lifetimeCount: safeNumber(lifetimeMap[key]),
    }))
    .filter((row) => row.count > 0 || row.lifetimeCount > 0 || STATUS_CHART_ORDER.includes(row.key));

  const total = statuses.reduce((sum, row) => sum + row.count, 0);

  return {
    statuses,
    total,
    period: { start: range.start, end: range.end, key: range.key },
  };
}

async function getMostViewedProducts(body = {}) {
  const range = resolveMarketplaceRange(body);
  const { page, limit, skip } = paginate(body);
  const categoryId = toObjectId(body.category || body.category_id);

  let productIds = null;
  if (categoryId) {
    const inCategory = await BuySellProduct.find({ category_id: categoryId }).select('_id').lean();
    productIds = inCategory.map((p) => p._id);
    if (!productIds.length) {
      return {
        items: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
        period: { start: range.start, end: range.end, key: range.key },
      };
    }
  }

  if (range.start || range.end) {
    const match = {
      ...viewedAtMatch(range.start, range.end),
      ...(productIds ? { productId: { $in: productIds } } : {}),
    };
    const [grouped, countRows] = await Promise.all([
      MarketItemView.aggregate([
        { $match: match },
        { $group: { _id: '$productId', views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]),
      MarketItemView.aggregate([
        { $match: match },
        { $group: { _id: '$productId' } },
        { $count: 'total' },
      ]),
    ]);

    const total = safeNumber(countRows[0]?.total);
    const ids = grouped.map((row) => row._id).filter(Boolean);
    const productMap = await hydrateProducts(ids);
    const items = grouped
      .map((row) => formatDashboardProduct(productMap.get(String(row._id)), { views: row.views }))
      .filter(Boolean);

    if (items.length > 0 || total > 0) {
      return {
        items,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
        period: { start: range.start, end: range.end, key: range.key },
      };
    }
    // Fall back to lifetime viewCount when no view events exist in the selected range.
  }

  const filter = {
    viewCount: { $gt: 0 },
    ...(categoryId ? { category_id: categoryId } : {}),
  };
  const [docs, total] = await Promise.all([
    BuySellProduct.find(filter)
      .sort({ viewCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('category_id', 'category_name')
      .populate('subcategory_id', 'sub_category_name')
      .populate('userid', 'name company_name')
      .populate('specifications.specification_id', 'specification_name')
      .lean(),
    BuySellProduct.countDocuments(filter),
  ]);

  return {
    items: docs.map((doc) => formatDashboardProduct(doc, { views: doc.viewCount })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
    period: { start: range.start, end: range.end, key: range.key },
  };
}

async function engagementMaps(productIds, start, end) {
  if (!productIds.length) {
    return { favorites: new Map(), offers: new Map() };
  }
  const dateMatch = createdAtMatch(start, end);
  const [favRows, offerRows] = await Promise.all([
    Favorite.aggregate([
      {
        $match: {
          entity: FAVORITE_ENTITY,
          is_favorite: true,
          entityId: { $in: productIds },
          ...dateMatch,
        },
      },
      { $group: { _id: '$entityId', count: { $sum: 1 } } },
    ]),
    ProductBitRecord.aggregate([
      { $match: { productId: { $in: productIds }, ...dateMatch } },
      { $group: { _id: '$productId', count: { $sum: 1 } } },
    ]),
  ]);
  return {
    favorites: new Map(favRows.map((r) => [String(r._id), safeNumber(r.count)])),
    offers: new Map(offerRows.map((r) => [String(r._id), safeNumber(r.count)])),
  };
}

async function getTopPerformingProducts(body = {}) {
  const range = resolveMarketplaceRange({
    ...body,
    period: body.period || body.range || 'last_30_days',
  });
  const { page, limit, skip } = paginate({ ...body, limit: body.limit || 8 });

  if (range.start || range.end) {
    const grouped = await MarketItemView.aggregate([
      { $match: viewedAtMatch(range.start, range.end) },
      { $group: { _id: '$productId', views: { $sum: 1 } } },
      { $sort: { views: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);
    const countRows = await MarketItemView.aggregate([
      { $match: viewedAtMatch(range.start, range.end) },
      { $group: { _id: '$productId' } },
      { $count: 'total' },
    ]);
    const total = safeNumber(countRows[0]?.total);
    const ids = grouped.map((row) => row._id).filter(Boolean);
    const [productMap, engagement] = await Promise.all([
      hydrateProducts(ids),
      engagementMaps(ids, range.start, range.end),
    ]);
    const items = grouped
      .map((row) => {
        const id = String(row._id);
        return formatDashboardProduct(productMap.get(id), {
          views: row.views,
          favorites: engagement.favorites.get(id) || 0,
          offers: engagement.offers.get(id) || 0,
        });
      })
      .filter(Boolean);

    if (items.length > 0 || total > 0) {
      return {
        items,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
        rankingMetric: 'views',
        period: { start: range.start, end: range.end, key: range.key },
      };
    }
  }

  const filter = { viewCount: { $gt: 0 } };
  const [docs, total] = await Promise.all([
    BuySellProduct.find(filter)
      .sort({ viewCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('category_id', 'category_name')
      .populate('subcategory_id', 'sub_category_name')
      .populate('userid', 'name company_name')
      .populate('specifications.specification_id', 'specification_name')
      .lean(),
    BuySellProduct.countDocuments(filter),
  ]);
  const ids = docs.map((d) => d._id);
  const engagement = await engagementMaps(ids, null, null);
  const items = docs.map((doc) =>
    formatDashboardProduct(doc, {
      views: doc.viewCount,
      favorites: engagement.favorites.get(String(doc._id)) || 0,
      offers: engagement.offers.get(String(doc._id)) || 0,
    }),
  );

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
    rankingMetric: 'views',
    period: { start: range.start, end: range.end, key: range.key },
  };
}

function formatIstDate(d) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function fillDateBuckets(start, end, rows, valueKey = 'views') {
  const byDate = new Map();
  const cursor = startOfDay(start);
  const last = startOfDay(end);
  while (cursor <= last) {
    const key = formatIstDate(cursor);
    byDate.set(key, { date: key, [valueKey]: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  rows.forEach((row) => {
    const key = row._id;
    if (byDate.has(key)) {
      byDate.get(key)[valueKey] = safeNumber(row.count);
    } else {
      byDate.set(key, { date: key, [valueKey]: safeNumber(row.count) });
    }
  });
  return Array.from(byDate.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

async function getProductViews(body = {}) {
  const range = resolveMarketplaceRange({
    ...body,
    period: body.range || body.period || '30d',
  });
  const start = range.start || startOfDay(addDays(new Date(), -29));
  const end = range.end || endOfDay(new Date());

  const rows = await MarketItemView.aggregate([
    { $match: viewedAtMatch(start, end) },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$viewedAt', timezone: TZ } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const trend = fillDateBuckets(start, end, rows, 'views');
  const totalViews = trend.reduce((sum, row) => sum + row.views, 0);

  return {
    range: range.key,
    totalViews,
    trend,
    period: { start, end, key: range.key },
  };
}

async function getCategoryAnalytics(body = {}) {
  const range = resolveMarketplaceRange(body);
  const match = createdAtMatch(range.start, range.end);
  const viewMatch = viewedAtMatch(range.start, range.end);

  const [productRows, viewRows] = await Promise.all([
    BuySellProduct.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$category_id',
          productCount: { $sum: 1 },
          views: { $sum: { $ifNull: ['$viewCount', 0] } },
          soldCount: {
            $sum: { $cond: [{ $eq: ['$status', 'sold'] }, 1, 0] },
          },
        },
      },
      { $sort: { productCount: -1 } },
      { $limit: 12 },
      {
        $lookup: {
          from: Category.collection.collectionName,
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    ]),
    range.start || range.end
      ? MarketItemView.aggregate([
          { $match: viewMatch },
          {
            $lookup: {
              from: BuySellProduct.collection.collectionName,
              localField: 'productId',
              foreignField: '_id',
              as: 'product',
            },
          },
          { $unwind: '$product' },
          { $group: { _id: '$product.category_id', views: { $sum: 1 } } },
        ])
      : Promise.resolve([]),
  ]);

  const viewsByCategory = new Map(viewRows.map((row) => [String(row._id), safeNumber(row.views)]));

  const items = productRows.map((row) => {
    const id = row._id ? String(row._id) : '';
    return {
      id,
      name: row.category?.category_name || 'Uncategorized',
      productCount: safeNumber(row.productCount),
      views: viewsByCategory.has(id) ? viewsByCategory.get(id) : safeNumber(row.views),
      soldCount: safeNumber(row.soldCount),
    };
  });

  return {
    items,
    period: { start: range.start, end: range.end, key: range.key },
  };
}

async function distinctCount(Model, field, match) {
  const rows = await Model.distinct(field, match);
  return rows.filter(Boolean).length;
}

async function getUserAnalytics(body = {}) {
  const range = resolveMarketplaceRange(body);
  const created = createdAtMatch(range.start, range.end);
  const viewed = viewedAtMatch(range.start, range.end);
  const userCreated = userCreatedMatch(range.start, range.end);

  const [
    totalUsers,
    newUsers,
    activeUsers,
    usersWhoViewedProducts,
    usersWhoFavorited,
    usersWhoContactedSellers,
    usersWhoCreatedListings,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments(userCreated),
    User.countDocuments({ status: 'active' }),
    distinctCount(MarketItemView, 'userId', { userId: { $ne: null }, ...viewed }),
    distinctCount(Favorite, 'userId', {
      entity: FAVORITE_ENTITY,
      is_favorite: true,
      ...created,
    }),
    distinctCount(ChatRoom, 'buyerId', created),
    distinctCount(BuySellProduct, 'userid', created),
  ]);

  return {
    totalUsers,
    newUsers,
    activeUsers,
    usersWhoViewedProducts,
    usersWhoFavorited,
    usersWhoContactedSellers,
    usersWhoCreatedListings,
    period: { start: range.start, end: range.end, key: range.key },
  };
}

function activityLabel(type, productName, vehicleId) {
  const idPart = vehicleId ? ` #${vehicleId}` : '';
  const name = productName || 'Product';
  switch (type) {
    case 'created':
      return `New product added: ${name}${idPart}`;
    case 'approved':
      return `${name}${idPart} was approved`;
    case 'rejected':
      return `${name}${idPart} was rejected`;
    case 'sold':
      return `${name}${idPart} was marked as sold`;
    case 'booking':
      return `${name}${idPart} was booked`;
    case 'purchased':
      return `${name}${idPart} was purchased`;
    case 'featured':
      return `${name}${idPart} was featured`;
    case 'offer':
      return `${name}${idPart} received an offer`;
    default:
      return `${name}${idPart} status changed`;
  }
}

async function getRecentActivity(body = {}) {
  const range = resolveMarketplaceRange(body);
  const limit = Math.min(40, Math.max(1, parseInt(body.limit, 10) || 12));
  const dateMatch = createdAtMatch(range.start, range.end);

  const [products, offers, featured] = await Promise.all([
    BuySellProduct.find(range.start || range.end ? dateMatch : {})
      .sort({ updatedAt: -1 })
      .limit(limit)
      .populate('userid', 'name')
      .populate('category_id', 'category_name')
      .populate('subcategory_id', 'sub_category_name')
      .select('id bsNumber vehicleId status description userid createdAt updatedAt soldAt bookedAt purchasedAt')
      .lean(),
    ProductBitRecord.find(dateMatch)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate({
        path: 'productId',
        select: 'id bsNumber vehicleId description status userid',
        populate: { path: 'userid', select: 'name' },
      })
      .lean(),
    BuySellFeaturedVehicle.find(dateMatch)
      .sort({ createdAt: -1 })
      .limit(Math.min(10, limit))
      .populate({
        path: 'productId',
        select: 'id bsNumber vehicleId description status userid',
        populate: { path: 'userid', select: 'name' },
      })
      .populate('userId', 'name')
      .lean(),
  ]);

  const events = [];

  products.forEach((p) => {
    const name = productDisplayName(p);
    const seller = p.userid?.name || 'Seller';
    const createdMs = p.createdAt ? new Date(p.createdAt).getTime() : 0;
    const updatedMs = p.updatedAt ? new Date(p.updatedAt).getTime() : 0;
    const isNew = Math.abs(updatedMs - createdMs) < 5000;

    if (isNew) {
      events.push({
        id: `created-${p._id}`,
        type: 'created',
        action: activityLabel('created', name, p.vehicleId),
        productId: p.id || String(p._id),
        productName: name,
        vehicleId: p.vehicleId || '',
        sellerName: seller,
        status: p.status,
        date: p.createdAt,
      });
      return;
    }

    let type = 'status_changed';
    if (p.status === 'sold') type = 'sold';
    else if (p.status === 'rejected') type = 'rejected';
    else if (p.status === 'accepeted') type = 'approved';
    else if (p.status === 'booking') type = 'booking';
    else if (p.status === 'purchased') type = 'purchased';

    events.push({
      id: `status-${p._id}-${updatedMs}`,
      type,
      action: activityLabel(type, name, p.vehicleId),
      productId: p.id || String(p._id),
      productName: name,
      vehicleId: p.vehicleId || '',
      sellerName: seller,
      status: p.status,
      date: p.updatedAt || p.createdAt,
    });
  });

  offers.forEach((bit) => {
    const product = bit.productId;
    if (!product) return;
    const name = productDisplayName(product);
    events.push({
      id: `offer-${bit._id}`,
      type: 'offer',
      action: activityLabel('offer', name, product.vehicleId),
      productId: product.id || String(product._id),
      productName: name,
      vehicleId: product.vehicleId || '',
      sellerName: product.userid?.name || bit.userName || 'Buyer',
      status: product.status,
      date: bit.createdAt,
    });
  });

  featured.forEach((row) => {
    const product = row.productId;
    if (!product) return;
    const name = productDisplayName(product);
    events.push({
      id: `featured-${row._id}`,
      type: 'featured',
      action: activityLabel('featured', name, product.vehicleId),
      productId: product.id || String(product._id),
      productName: name,
      vehicleId: product.vehicleId || '',
      sellerName: row.userId?.name || product.userid?.name || 'Seller',
      status: row.status || product.status,
      date: row.approvedAt || row.createdAt,
    });
  });

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    items: events.slice(0, limit),
    period: { start: range.start, end: range.end, key: range.key },
  };
}

module.exports = {
  resolveMarketplaceRange,
  getSummary,
  getProductStatus,
  getMostViewedProducts,
  getTopPerformingProducts,
  getProductViews,
  getCategoryAnalytics,
  getUserAnalytics,
  getRecentActivity,
};
