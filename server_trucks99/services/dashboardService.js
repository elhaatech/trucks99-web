'use strict';

const mongoose = require('mongoose');
const Load = require('../schema/load');
const Truck = require('../schema/truck');
const User = require('../schema/user');
const BuySellProduct = require('../schema/buysellProduct');
const IncomeExpense = require('../schema/incomeExpense');
const LoadBitRecord = require('../schema/loadBitRecord');
const TruckBitRecord = require('../schema/truckBitRecord');
const ProductBitRecord = require('../schema/productBitRecord');

// ── Date helpers ─────────────────────────────────────────────────────────────

function startOfWeekMonday(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeekSunday(d) {
  const s = startOfWeekMonday(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

function parseDateInput(value, endOfDay = false) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Resolve date range from POST body.
 * Supports period: daily | weekly | monthly | yearly | custom (via dateFrom/dateTo).
 */
function resolveDateRange(body = {}) {
  const now = new Date();
  const { period = 'weekly', dateFrom, dateTo } = body;

  if (dateFrom || dateTo) {
    const start = parseDateInput(dateFrom) || startOfWeekMonday(now);
    const end = parseDateInput(dateTo, true) || endOfWeekSunday(now);
    return { start, end, period: 'custom' };
  }

  let start;
  let end;

  switch (String(period).toLowerCase()) {
    case 'daily':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    case 'monthly':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'yearly':
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    case 'weekly':
    default:
      start = startOfWeekMonday(now);
      end = endOfWeekSunday(now);
      break;
  }

  return { start, end, period: String(period).toLowerCase() };
}

function previousPeriodRange(start, end) {
  const durationMs = end.getTime() - start.getTime() + 1;
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs + 1);
  prevStart.setHours(0, 0, 0, 0);
  prevEnd.setHours(23, 59, 59, 999);
  return { start: prevStart, end: prevEnd };
}

function createdAtMatch(start, end) {
  return { createdAt: { $gte: start, $lte: end } };
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function paginate(body = {}) {
  const page = Math.max(1, parseInt(body.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(body.limit, 10) || 10));
  return { page, limit, skip: (page - 1) * limit };
}

function objectIdFromDate(date) {
  return mongoose.Types.ObjectId.createFromTime(Math.floor(date.getTime() / 1000));
}

function userCreatedAtMatch(start, end) {
  return {
    _id: {
      $gte: objectIdFromDate(start),
      $lte: objectIdFromDate(end),
    },
  };
}

// ── Scope filters (non-admin users see only their data) ─────────────────────

function incomeScopeFilter(scope) {
  if (scope.isAdmin) return {};
  return { userId: scope.userId };
}

function loadScopeFilter(scope) {
  if (scope.isAdmin) return {};
  const uid = scope.userId;
  return {
    $or: [{ ownerId: uid }, { userId: uid }, { createdBy: uid }],
  };
}

function truckScopeFilter(scope) {
  if (scope.isAdmin) return {};
  return { $or: [{ ownerId: scope.userId }, { createdBy: scope.userId }] };
}

function productScopeFilter(scope) {
  if (scope.isAdmin) return {};
  return { userid: scope.userId };
}

function bitUserScopeFilter(scope) {
  if (scope.isAdmin) return {};
  return { userId: scope.userId };
}

// ── Core dashboard queries ───────────────────────────────────────────────────

async function getWeeklyIncome(scope, body) {
  const { start, end } = resolveDateRange(body);
  const match = {
    type: 'income',
    status: 'active',
    ...createdAtMatch(start, end),
    ...incomeScopeFilter(scope),
  };

  const [result] = await IncomeExpense.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  return { weeklyIncome: safeNumber(result?.total), period: { start, end } };
}

async function getWeeklyBookings(scope, body) {
  const { start, end } = resolveDateRange(body);
  const dateMatch = createdAtMatch(start, end);
  const bitScope = bitUserScopeFilter(scope);

  const loadMatch = { status: 'accept', ...dateMatch, ...bitScope };
  const truckMatch = { status: 'accept', ...dateMatch, ...bitScope };

  if (!scope.isAdmin) {
    const loadIds = await Load.find(loadScopeFilter(scope)).select('_id').lean();
    const truckIds = await Truck.find(truckScopeFilter(scope)).select('_id').lean();
    loadMatch.loadId = { $in: loadIds.map((l) => l._id) };
    truckMatch.truckId = { $in: truckIds.map((t) => t._id) };
  }

  const [loadsBooked, trucksBooked] = await Promise.all([
    LoadBitRecord.countDocuments(loadMatch),
    TruckBitRecord.countDocuments(truckMatch),
  ]);

  return { loadsBooked, trucksBooked, period: { start, end } };
}

async function getTransactionSummary(scope, body) {
  const { start, end } = resolveDateRange(body);
  const dateMatch = createdAtMatch(start, end);
  const bitScope = bitUserScopeFilter(scope);

  const buildPipeline = (Model, extraMatch = {}) => [
    { $match: { status: 'accept', ...dateMatch, ...bitScope, ...extraMatch } },
    { $group: { _id: null, total: { $sum: '$bit' } } },
  ];

  let loadExtra = {};
  let truckExtra = {};
  let productExtra = {};

  if (!scope.isAdmin) {
    const [loadIds, truckIds, productIds] = await Promise.all([
      Load.find(loadScopeFilter(scope)).select('_id').lean(),
      Truck.find(truckScopeFilter(scope)).select('_id').lean(),
      BuySellProduct.find(productScopeFilter(scope)).select('_id').lean(),
    ]);
    loadExtra = { loadId: { $in: loadIds.map((l) => l._id) } };
    truckExtra = { truckId: { $in: truckIds.map((t) => t._id) } };
    productExtra = { productId: { $in: productIds.map((p) => p._id) } };
  }

  const [[loadRes], [truckRes], [sellRes]] = await Promise.all([
    LoadBitRecord.aggregate(buildPipeline(LoadBitRecord, loadExtra)),
    TruckBitRecord.aggregate(buildPipeline(TruckBitRecord, truckExtra)),
    ProductBitRecord.aggregate(buildPipeline(ProductBitRecord, productExtra)),
  ]);

  return {
    loadTransactions: safeNumber(loadRes?.total),
    truckTransactions: safeNumber(truckRes?.total),
    sellTransactions: safeNumber(sellRes?.total),
    period: { start, end },
  };
}

async function getTotalCounts(scope) {
  const filters = scope.isAdmin
    ? [{}, {}, {}, {}]
    : [
        loadScopeFilter(scope),
        truckScopeFilter(scope),
        productScopeFilter(scope),
        { _id: scope.userId },
      ];

  const [totalUsers, totalTrucks, totalLoads, totalBuySellItems] = await Promise.all([
    scope.isAdmin ? User.countDocuments({}) : Promise.resolve(1),
    Truck.countDocuments(filters[1]),
    Load.countDocuments(filters[0]),
    BuySellProduct.countDocuments(filters[2]),
  ]);

  return { totalUsers, totalTrucks, totalLoads, totalBuySellItems };
}

async function getStatusCounts(scope) {
  const loadFilter = loadScopeFilter(scope);
  const truckFilter = truckScopeFilter(scope);
  const productFilter = productScopeFilter(scope);

  const [loadAgg, truckAgg, productAgg] = await Promise.all([
    Load.aggregate([
      ...(Object.keys(loadFilter).length ? [{ $match: loadFilter }] : []),
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Truck.aggregate([
      ...(Object.keys(truckFilter).length ? [{ $match: truckFilter }] : []),
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    BuySellProduct.aggregate([
      ...(Object.keys(productFilter).length ? [{ $match: productFilter }] : []),
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const loadMap = Object.fromEntries(loadAgg.map(({ _id, count }) => [_id, count]));
  const truckMap = Object.fromEntries(truckAgg.map(({ _id, count }) => [_id, count]));
  const productMap = Object.fromEntries(productAgg.map(({ _id, count }) => [_id, count]));

  return {
    loads: {
      pending: safeNumber(loadMap.pending),
      accepted: safeNumber(loadMap.accepted) + safeNumber(loadMap.assigned),
      delivered: safeNumber(loadMap.delivered),
      cancelled: safeNumber(loadMap.cancelled),
    },
    trucks: {
      available: safeNumber(truckMap.available),
      booked:
        safeNumber(truckMap['in-transit']) + safeNumber(truckMap.unavailable),
      inTransit: safeNumber(truckMap['in-transit']),
    },
    buySell: {
      active: safeNumber(productMap.active),
      booking: safeNumber(productMap.booking),
      purchased: safeNumber(productMap.purchased),
      sold: safeNumber(productMap.sold),
      pending: safeNumber(productMap.pending),
      rejected: safeNumber(productMap.rejected),
      draft: safeNumber(productMap.draft),
      inactive: safeNumber(productMap.inactive),
      closed: safeNumber(productMap.inactive),
    },
  };
}

async function getWeeklyGrowth(scope, body) {
  const { start, end } = resolveDateRange(body);
  const prev = previousPeriodRange(start, end);

  const countInRange = async (Model, filter, rangeStart, rangeEnd, useObjectIdTime = false) => {
    const dateFilter = useObjectIdTime
      ? userCreatedAtMatch(rangeStart, rangeEnd)
      : createdAtMatch(rangeStart, rangeEnd);
    return Model.countDocuments({ ...filter, ...dateFilter });
  };

  const userFilter = scope.isAdmin ? {} : { _id: scope.userId };
  const loadFilter = loadScopeFilter(scope);
  const truckFilter = truckScopeFilter(scope);
  const productFilter = productScopeFilter(scope);

  const [
    newUsersThis, newUsersLast,
    newLoadsThis, newLoadsLast,
    newTrucksThis, newTrucksLast,
    newProductsThis, newProductsLast,
  ] = await Promise.all([
    countInRange(User, userFilter, start, end, true),
    countInRange(User, userFilter, prev.start, prev.end, true),
    countInRange(Load, loadFilter, start, end),
    countInRange(Load, loadFilter, prev.start, prev.end),
    countInRange(Truck, truckFilter, start, end),
    countInRange(Truck, truckFilter, prev.start, prev.end),
    countInRange(BuySellProduct, productFilter, start, end),
    countInRange(BuySellProduct, productFilter, prev.start, prev.end),
  ]);

  return {
    newUsers: { thisWeek: newUsersThis, lastWeek: newUsersLast, change: newUsersThis - newUsersLast },
    newLoads: { thisWeek: newLoadsThis, lastWeek: newLoadsLast, change: newLoadsThis - newLoadsLast },
    newTrucks: { thisWeek: newTrucksThis, lastWeek: newTrucksLast, change: newTrucksThis - newTrucksLast },
    newBuySellItems: {
      thisWeek: newProductsThis,
      lastWeek: newProductsLast,
      change: newProductsThis - newProductsLast,
    },
    period: { start, end },
    previousPeriod: prev,
  };
}

async function getRecentActivities(scope, body) {
  const limit = Math.min(50, Math.max(1, parseInt(body.limit, 10) || 10));
  const bitScope = bitUserScopeFilter(scope);

  let loadFilter = {};
  let truckFilter = {};
  let productFilter = {};

  if (!scope.isAdmin) {
    const [loadIds, truckIds, productIds] = await Promise.all([
      Load.find(loadScopeFilter(scope)).select('_id').lean(),
      Truck.find(truckScopeFilter(scope)).select('_id').lean(),
      BuySellProduct.find(productScopeFilter(scope)).select('_id').lean(),
    ]);
    loadFilter = { loadId: { $in: loadIds.map((l) => l._id) } };
    truckFilter = { truckId: { $in: truckIds.map((t) => t._id) } };
    productFilter = { productId: { $in: productIds.map((p) => p._id) } };
  }

  const [acceptedLoads, deliveredLoads, acceptedTruckOffers, acceptedBuySellOffers] =
    await Promise.all([
      Load.find({ status: 'accepted', ...loadScopeFilter(scope) })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .select('id loadNumber title status bit updatedAt createdAt')
        .lean(),
      Load.find({ status: 'delivered', ...loadScopeFilter(scope) })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .select('id loadNumber title status bit updatedAt createdAt')
        .lean(),
      TruckBitRecord.find({ status: 'accept', ...bitScope, ...truckFilter })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .populate('truckId', 'id truckNumber registrationNumber')
        .populate('loadId', 'id loadNumber title')
        .lean(),
      ProductBitRecord.find({ status: 'accept', ...bitScope, ...productFilter })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .populate('productId', 'id bsNumber price description')
        .lean(),
    ]);

  return {
    acceptedLoads,
    deliveredLoads,
    acceptedTruckOffers,
    acceptedBuySellOffers,
  };
}

async function getRevenueSummary(scope, body) {
  const { start, end } = resolveDateRange(body);
  const dateMatch = createdAtMatch(start, end);
  const scopeFilter = incomeScopeFilter(scope);

  const [incomeRes, expenseRes] = await Promise.all([
    IncomeExpense.aggregate([
      { $match: { type: 'income', status: 'active', ...dateMatch, ...scopeFilter } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    IncomeExpense.aggregate([
      { $match: { type: 'expense', status: 'active', ...dateMatch, ...scopeFilter } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const totalIncome = safeNumber(incomeRes[0]?.total);
  const totalExpense = safeNumber(expenseRes[0]?.total);

  return {
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    period: { start, end },
  };
}

async function getTopStatistics(scope) {
  const loadFilter = loadScopeFilter(scope);
  const productFilter = productScopeFilter(scope);

  const loadMatchStages = Object.keys(loadFilter).length ? [{ $match: loadFilter }] : [];
  const productMatchStages = Object.keys(productFilter).length ? [{ $match: productFilter }] : [];

  const [
    mostBookedTruckAgg,
    mostViewedMarketItem,
    mostActiveSellerAgg,
    mostActiveTruckOwnerAgg,
  ] = await Promise.all([
    Load.aggregate([
      ...loadMatchStages,
      { $match: { accepted_truckIds: { $exists: true, $ne: [] } } },
      { $unwind: '$accepted_truckIds' },
      { $group: { _id: '$accepted_truckIds', bookingCount: { $sum: 1 } } },
      { $sort: { bookingCount: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: 'trucks',
          localField: '_id',
          foreignField: '_id',
          as: 'truck',
        },
      },
      { $unwind: { path: '$truck', preserveNullAndEmptyArrays: true } },
    ]),
    BuySellProduct.findOne({ ...productFilter, viewCount: { $gt: 0 } })
      .sort({ viewCount: -1 })
      .select('id bsNumber description price viewCount userid')
      .lean(),
    ProductBitRecord.aggregate([
      { $match: { status: 'accept' } },
      {
        $lookup: {
          from: 'buysellproducts',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      ...(Object.keys(productFilter).length
        ? [{ $match: { 'product.userid': productFilter.userid } }]
        : []),
      { $group: { _id: '$product.userid', transactionCount: { $sum: 1 } } },
      { $sort: { transactionCount: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ]),
    (() => {
      const ownerMatch = scope.isAdmin
        ? { 'truck.ownerId': { $ne: null } }
        : { 'truck.ownerId': scope.userId };
      return LoadBitRecord.aggregate([
        { $match: { status: 'accept', ...bitUserScopeFilter(scope) } },
        {
          $lookup: {
            from: 'trucks',
            localField: 'truckId',
            foreignField: '_id',
            as: 'truck',
          },
        },
        { $unwind: { path: '$truck', preserveNullAndEmptyArrays: false } },
        { $match: ownerMatch },
        { $group: { _id: '$truck.ownerId', transactionCount: { $sum: 1 } } },
        { $sort: { transactionCount: -1 } },
        { $limit: 1 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      ]);
    })(),
  ]);

  const truckRow = mostBookedTruckAgg[0];
  const sellerRow = mostActiveSellerAgg[0];
  const ownerRow = mostActiveTruckOwnerAgg[0];

  return {
    mostBookedTruck: truckRow
      ? {
          truckId: truckRow._id,
          truckNumber: truckRow.truck?.truckNumber || truckRow.truck?.registrationNumber,
          bookingCount: truckRow.bookingCount,
        }
      : null,
    mostViewedMarketItem: mostViewedMarketItem
      ? {
          id: mostViewedMarketItem.id,
          bsNumber: mostViewedMarketItem.bsNumber,
          description: mostViewedMarketItem.description,
          viewCount: mostViewedMarketItem.viewCount || 0,
        }
      : null,
    mostActiveSeller: sellerRow
      ? {
          userId: sellerRow._id,
          name: sellerRow.user?.name,
          transactionCount: sellerRow.transactionCount,
        }
      : null,
    mostActiveTruckOwner: ownerRow
      ? {
          userId: ownerRow._id,
          name: ownerRow.user?.name,
          transactionCount: ownerRow.transactionCount,
        }
      : null,
  };
}

async function getRevenueTrend(scope, body) {
  const days = Math.min(365, Math.max(1, parseInt(body.days, 10) || 7));
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const scopeFilter = incomeScopeFilter(scope);

  const rows = await IncomeExpense.aggregate([
    {
      $match: {
        status: 'active',
        ...createdAtMatch(start, end),
        ...scopeFilter,
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          type: '$type',
        },
        total: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.date': 1 } },
  ]);

  const byDate = new Map();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    byDate.set(key, { date: key, income: 0, expense: 0, net: 0 });
  }

  rows.forEach(({ _id, total }) => {
    const row = byDate.get(_id.date);
    if (!row) return;
    if (_id.type === 'income') row.income = safeNumber(total);
    if (_id.type === 'expense') row.expense = safeNumber(total);
    row.net = row.income - row.expense;
  });

  return { days, trend: Array.from(byDate.values()) };
}

async function getRecentTransactions(scope, body) {
  const { page, limit, skip } = paginate(body);
  const scopeFilter = incomeScopeFilter(scope);

  const [items, total] = await Promise.all([
    IncomeExpense.find({ status: 'active', ...scopeFilter })
      .populate('categoryId', 'categoryName type')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    IncomeExpense.countDocuments({ status: 'active', ...scopeFilter }),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
  };
}

async function getTopItems(scope, body) {
  const limit = Math.min(20, Math.max(1, parseInt(body.limit, 10) || 5));

  const [loads, trucks, marketItems] = await Promise.all([
    Load.find(loadScopeFilter(scope))
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('id loadNumber title status bit createdAt')
      .lean(),
    Truck.find(truckScopeFilter(scope))
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('id truckNumber registrationNumber status createdAt')
      .lean(),
    BuySellProduct.find(productScopeFilter(scope))
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('id bsNumber description price status viewCount createdAt')
      .lean(),
  ]);

  return { loads, trucks, marketItems };
}

async function getTopUsers(scope, body) {
  if (!scope.isAdmin) {
    return { users: [], message: 'Admin only' };
  }

  const limit = Math.min(20, Math.max(1, parseInt(body.limit, 10) || 5));

  const users = await IncomeExpense.aggregate([
    { $match: { status: 'active', type: 'income' } },
    { $group: { _id: '$userId', completedAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { completedAmount: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        userId: '$_id',
        name: '$user.name',
        email: '$user.email',
        completedAmount: 1,
        transactionCount: '$count',
      },
    },
  ]);

  return { users };
}

async function getAlerts(scope, body) {
  const { start, end } = resolveDateRange(body);
  const dateMatch = createdAtMatch(start, end);

  const [loadsBooked, trucksBooked, txCount, cancelledLoads, failedBits] =
    await Promise.all([
      getWeeklyBookings(scope, body),
      IncomeExpense.countDocuments({
        status: 'active',
        ...dateMatch,
        ...incomeScopeFilter(scope),
      }),
      Load.countDocuments({ status: 'cancelled', ...loadScopeFilter(scope), ...dateMatch }),
      LoadBitRecord.countDocuments({
        status: 'reject',
        ...dateMatch,
        ...bitUserScopeFilter(scope),
      }),
    ]);

  const lowActivity =
    loadsBooked.loadsBooked === 0 &&
    loadsBooked.trucksBooked === 0 &&
    txCount === 0;

  return {
    lowActivity,
    noBookings: loadsBooked.loadsBooked === 0 && loadsBooked.trucksBooked === 0,
    noTransactions: txCount === 0,
    cancelledBookingCount: cancelledLoads,
    failedOrRejectedOffers: failedBits,
  };
}

async function getTransactionStats(scope, body) {
  const { start, end } = resolveDateRange(body);
  const dateMatch = createdAtMatch(start, end);
  const scopeFilter = incomeScopeFilter(scope);

  const [acceptedLoads, acceptedTrucks, acceptedProducts, incomeStats, pendingLoads, pendingBits] =
    await Promise.all([
      LoadBitRecord.countDocuments({ status: 'accept', ...dateMatch, ...bitUserScopeFilter(scope) }),
      TruckBitRecord.countDocuments({ status: 'accept', ...dateMatch, ...bitUserScopeFilter(scope) }),
      ProductBitRecord.countDocuments({ status: 'accept', ...dateMatch, ...bitUserScopeFilter(scope) }),
      IncomeExpense.aggregate([
        { $match: { status: 'active', ...dateMatch, ...scopeFilter } },
        {
          $group: {
            _id: null,
            avgAmount: { $avg: '$amount' },
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      Load.countDocuments({ status: 'pending', ...loadScopeFilter(scope) }),
      LoadBitRecord.countDocuments({ status: 'pending', ...dateMatch, ...bitUserScopeFilter(scope) }),
    ]);

  const completed = acceptedLoads + acceptedTrucks + acceptedProducts;
  const pending = pendingLoads + pendingBits;

  return {
    averageTransactionValue: safeNumber(incomeStats[0]?.avgAmount),
    averageBookingValue:
      completed > 0 ? safeNumber(incomeStats[0]?.total) / completed : 0,
    completedTransactions: completed,
    pendingTransactions: pending,
    period: { start, end },
  };
}

async function getRecentUsers(scope, body) {
  if (!scope.isAdmin) {
    return { users: [] };
  }

  const { page, limit, skip } = paginate(body);

  const [users, total] = await Promise.all([
    User.find({})
      .populate('roleId', 'name')
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit)
      .select('id name email mobile status roleId')
      .lean(),
    User.countDocuments({}),
  ]);

  return {
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      mobile: u.mobile,
      status: u.status,
      role: u.roleId?.name || null,
      createdAt: u._id
        ? new mongoose.Types.ObjectId(String(u._id)).getTimestamp()
        : null,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
  };
}

async function getOverview(scope, body) {
  const [
    weeklyIncome,
    weeklyBookings,
    transactionSummary,
    totalCounts,
    statusCounts,
    weeklyGrowth,
    revenueSummary,
    topStatistics,
    alerts,
    transactionStats,
  ] = await Promise.all([
    getWeeklyIncome(scope, body),
    getWeeklyBookings(scope, body),
    getTransactionSummary(scope, body),
    getTotalCounts(scope),
    getStatusCounts(scope),
    getWeeklyGrowth(scope, body),
    getRevenueSummary(scope, body),
    getTopStatistics(scope),
    getAlerts(scope, body),
    getTransactionStats(scope, body),
  ]);

  return {
    weeklyIncome: weeklyIncome.weeklyIncome,
    weeklyBookings,
    transactionSummary,
    totalCounts,
    statusCounts,
    weeklyGrowth,
    revenueSummary,
    topStatistics,
    alerts,
    transactionStats,
    period: weeklyIncome.period,
  };
}

module.exports = {
  resolveDateRange,
  getWeeklyIncome,
  getWeeklyBookings,
  getTransactionSummary,
  getTotalCounts,
  getStatusCounts,
  getWeeklyGrowth,
  getRecentActivities,
  getRevenueSummary,
  getTopStatistics,
  getRevenueTrend,
  getRecentTransactions,
  getTopItems,
  getTopUsers,
  getAlerts,
  getTransactionStats,
  getRecentUsers,
  getOverview,
};
