'use strict';

const express  = require('express');
const mongoose = require('mongoose');
const ExcelJS  = require('exceljs');
const Load     = require('../schema/load');
const Truck    = require('../schema/truck');
const BuySell  = require('../schema/buysellProduct');


const reportRouter = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeRegex(s) {
  return String(s).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseFilters(body = {}) {
  const {
    dateFrom, dateTo,
    origin, destination,
    status, truckType,
    vehicleType, truck_status,
    loadType,
  } = body;

  const dateRange = {};
  if (dateFrom) dateRange.$gte = new Date(dateFrom);
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    dateRange.$lte = end;
  }

  const loadFilter = {};
  if (Object.keys(dateRange).length) loadFilter.createdAt = dateRange;

  const andConditions = [];
  if (origin) {
    const re = new RegExp(escapeRegex(origin), 'i');
    andConditions.push({ $or: [{ origin: re }, { 'pickupLocation.address': re }] });
  }
  if (destination) {
    const re = new RegExp(escapeRegex(destination), 'i');
    andConditions.push({ $or: [{ destination: re }, { 'dropLocation.address': re }] });
  }
  if (andConditions.length) loadFilter.$and = andConditions;

  if (status)       loadFilter.status       = Array.isArray(status)       ? { $in: status }       : status;
  if (truckType)    loadFilter.truckType    = new RegExp(escapeRegex(truckType),   'i');
  if (vehicleType)  loadFilter.vehicleType  = new RegExp(escapeRegex(vehicleType), 'i');
  if (truck_status) loadFilter.truck_status = Array.isArray(truck_status) ? { $in: truck_status } : truck_status;
  if (loadType)     loadFilter.truck_status = loadType;

  const truckFilter = {};
  if (Object.keys(dateRange).length) truckFilter.createdAt = dateRange;
  if (truckType)    truckFilter.truckType    = new RegExp(escapeRegex(truckType), 'i');
  if (truck_status) truckFilter.truck_status = Array.isArray(truck_status) ? { $in: truck_status } : truck_status;

  return { loadFilter, truckFilter, dateRange };
}

/**
 * Parse BuySell-specific filters from request body.
 * Field names match buySellSchema exactly.
 */
function parseBuySellFilters(body = {}) {
  const { dateFrom, dateTo, user_type, status, search } = body;
  const filter = {};

  const dateRange = {};
  if (dateFrom) dateRange.$gte = new Date(dateFrom);
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    dateRange.$lte = end;
  }
  if (Object.keys(dateRange).length) filter.createdAt = dateRange;

  // user_type: "buy" | "sell"
  if (user_type) {
    filter.user_type = Array.isArray(user_type) ? { $in: user_type } : user_type;
  }

  // status: "Active" | "Inactive"  (capital first letter — matches schema enum)
  if (status) {
    const normalise = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    filter.status = Array.isArray(status)
      ? { $in: status.map(normalise) }
      : normalise(status);
  }

  // search: partial match against address or pincode
  if (search) {
    const re = new RegExp(
      String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i'
    );
    filter.$or = [{ address: re }, { pincode: re }];
  }

  return filter;
}

function getPagination(body = {}) {
  const page  = Math.max(1, parseInt(body.page)  || 1);
  const limit = Math.min(200, Math.max(1, parseInt(body.limit) || 20));
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
}

// ─── Field selectors ──────────────────────────────────────────────────────────

const LOAD_SELECT  = 'id loadNumber title origin destination status truck_status truckType vehicleType weight price material mobileNumber truckRegistrationNumber truckDriverName pickupLocation dropLocation rejectReason createdAt updatedAt';
const TRUCK_SELECT = 'id registrationNumber truckType capacity loadCapacity truck_status status currentLocation contactNumber vehicleBodyType total_tire containerFeet createdAt updatedAt';
const BUYSELL_SELECT = 'id category_id subcategory_id userid price description images address pincode user_type status created_by updated_by createdAt updatedAt';

// ─── Excel helpers ────────────────────────────────────────────────────────────

const HEADER_STYLE = {
  font:      { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Arial' },
  fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } },
  alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
  border: {
    top:    { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    left:   { style: 'thin', color: { argb: 'FF000000' } },
    right:  { style: 'thin', color: { argb: 'FF000000' } },
  },
};

const DATA_BORDER = {
  top:    { style: 'hair', color: { argb: 'FFCCCCCC' } },
  bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } },
  left:   { style: 'hair', color: { argb: 'FFCCCCCC' } },
  right:  { style: 'hair', color: { argb: 'FFCCCCCC' } },
};

async function sendExcel(res, filename, headers, rows) {
  const wb   = new ExcelJS.Workbook();
  wb.creator = 'LoadBoard Reports';
  wb.created = new Date();

  const ws = wb.addWorksheet('Report', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  ws.columns = headers.map(h => ({
    header: h,
    key:    h,
    width:  Math.max(h.length + 4, 16),
  }));

  const headerRow  = ws.getRow(1);
  headerRow.height = 28;
  headers.forEach((_, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.style = HEADER_STYLE;
  });

  rows.forEach((rowValues, ri) => {
    const row  = ws.addRow(rowValues);
    row.height = 18;
    const fill = {
      type:    'pattern',
      pattern: 'solid',
      fgColor: { argb: ri % 2 === 0 ? 'FFF5F8FC' : 'FFFFFFFF' },
    };
    rowValues.forEach((_, ci) => {
      const cell = row.getCell(ci + 1);
      cell.style = {
        font:      { name: 'Arial', size: 10 },
        alignment: { vertical: 'middle' },
        border:    DATA_BORDER,
        fill,
      };
    });
  });

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: headers.length },
  };

  res.setHeader('Content-Type',        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  res.setHeader('Cache-Control',       'no-cache');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type');

  await wb.xlsx.write(res);
  res.end();
}

// ─── Row definitions ──────────────────────────────────────────────────────────

const LOAD_HEADERS = [
  'LoadID', 'LoadNumber', 'Title', 'Origin', 'Destination', 'Status',
  'TruckBodyType', 'TruckType', 'VehicleType', 'Weight', 'Price', 'Material',
  'MobileNumber', 'TruckRegNumber', 'DriverName', 'RejectReason',
  'CreatedAt', 'UpdatedAt',
];

function loadToRow(l) {
  return [
    l.id || String(l._id),
    l.loadNumber                 || '',
    l.title                      || '',
    l.origin                     || l.pickupLocation?.address || '',
    l.destination                || l.dropLocation?.address   || '',
    l.status                     || '',
    l.truck_status               || '',
    l.truckType                  || '',
    l.vehicleType                || '',
    l.weight                     || '',
    l.price                      || 0,
    l.material                   || '',
    l.mobileNumber               || '',
    l.truckRegistrationNumber    || '',
    l.truckDriverName            || '',
    l.rejectReason               || '',
    l.createdAt ? new Date(l.createdAt).toISOString().slice(0, 19).replace('T', ' ') : '',
    l.updatedAt ? new Date(l.updatedAt).toISOString().slice(0, 19).replace('T', ' ') : '',
  ];
}

const TRUCK_HEADERS = [
  'TruckID', 'RegNumber', 'TruckType', 'Capacity', 'LoadCapacity',
  'TruckBodyType', 'Status', 'CurrentLocation', 'ContactNumber',
  'VehicleBodyType', 'TotalTire', 'ContainerFeet', 'CreatedAt',
];

function truckToRow(t) {
  return [
    t.id || String(t._id),
    t.registrationNumber || '',
    t.truckType          || '',
    t.capacity           || '',
    t.loadCapacity       || '',
    t.truck_status       || '',
    t.status             || '',
    t.currentLocation    || '',
    t.contactNumber      || '',
    t.vehicleBodyType    || '',
    t.total_tire         || '',
    t.containerFeet      || '',
    t.createdAt ? new Date(t.createdAt).toISOString().slice(0, 19).replace('T', ' ') : '',
  ];
}

const BUYSELL_HEADERS = [
  'ID', 'UserType', 'Status', 'Price', 'Description',
  'Address', 'Pincode', 'CreatedBy', 'UpdatedBy', 'CreatedAt', 'UpdatedAt',
];

function buySellToRow(b) {
  return [
    b.id || String(b._id),
    b.user_type   || '',
    b.status      || '',
    b.price != null ? b.price : '',
    b.description || '',
    b.address     || '',
    b.pincode     || '',
    b.created_by  || '',
    b.updated_by  || '',
    b.createdAt ? new Date(b.createdAt).toISOString().slice(0, 19).replace('T', ' ') : '',
    b.updatedAt ? new Date(b.updatedAt).toISOString().slice(0, 19).replace('T', ' ') : '',
  ];
}

// NEW ── Category report row definitions ───────────────────────────────────────

const CATEGORY_SELL_HEADERS = [
  'CategoryID', 'CategoryName', 'SubcategoryID', 'SubcategoryName',
  'TotalPosted', 'ActiveCount', 'InactiveCount', 'AvgPrice', 'MinPrice', 'MaxPrice',
];

function categorySellToRow(r) {
  return [
    r.categoryId      || '',
    r.categoryName    || 'Unknown',
    r.subcategoryId   || '',
    r.subcategoryName || 'Unknown',
    r.totalPosted     || 0,
    r.activeCount     || 0,
    r.inactiveCount   || 0,
    r.avgPrice        || 0,
    r.minPrice        || 0,
    r.maxPrice        || 0,
  ];
}

const CATEGORY_SOLD_HEADERS = [
  'CategoryID', 'CategoryName', 'SubcategoryID', 'SubcategoryName',
  'TotalSold', 'AvgPrice', 'MinPrice', 'MaxPrice',
];

function categorySoldToRow(r) {
  return [
    r.categoryId      || '',
    r.categoryName    || 'Unknown',
    r.subcategoryId   || '',
    r.subcategoryName || 'Unknown',
    r.totalSold       || 0,
    r.avgPrice        || 0,
    r.minPrice        || 0,
    r.maxPrice        || 0,
  ];
}

// ─── Shared category-name enrichment helper ───────────────────────────────────
// Tries to resolve ObjectId → name from 'categories' / 'subcategories' collections.
// Non-fatal: falls back to the raw ID string when the collection doesn't exist.
async function enrichWithCategoryNames(rows) {
  try {
    const db       = mongoose.connection.db;
    const colNames = (await db.listCollections().toArray()).map(c => c.name);

    const toOid = (id) => {
      try { return new mongoose.Types.ObjectId(id); } catch { return id; }
    };

    const catMap = {};
    const subMap = {};

    const catIds = [...new Set(rows.map(r => r.categoryId).filter(Boolean))];
    const subIds = [...new Set(rows.map(r => r.subcategoryId).filter(Boolean))];

    if (colNames.includes('categories') && catIds.length) {
      const cats = await db.collection('categories')
        .find({ _id: { $in: catIds.map(toOid) } })
        .project({ _id: 1, name: 1 })
        .toArray();
      cats.forEach(c => { catMap[String(c._id)] = c.name; });
    }

    if (colNames.includes('subcategories') && subIds.length) {
      const subs = await db.collection('subcategories')
        .find({ _id: { $in: subIds.map(toOid) } })
        .project({ _id: 1, name: 1 })
        .toArray();
      subs.forEach(s => { subMap[String(s._id)] = s.name; });
    }

    return rows.map(r => ({
      ...r,
      categoryName:    catMap[String(r.categoryId)]    || String(r.categoryId    || 'Unknown'),
      subcategoryName: subMap[String(r.subcategoryId)] || String(r.subcategoryId || 'Unknown'),
    }));
  } catch (_) {
    return rows.map(r => ({
      ...r,
      categoryName:    String(r.categoryId    || 'Unknown'),
      subcategoryName: String(r.subcategoryId || 'Unknown'),
    }));
  }
}

// ─── 1. Overview / Dashboard ──────────────────────────────────────────────────
reportRouter.post('/overview', async (req, res) => {
  try {
    const { loadFilter, truckFilter } = parseFilters(req.body);

    const loadFields = {
      id:1, loadNumber:1, title:1, origin:1, destination:1,
      status:1, truck_status:1, truckType:1, vehicleType:1,
      weight:1, price:1, material:1, mobileNumber:1,
      truckRegistrationNumber:1, truckDriverName:1,
      pickupLocation:1, dropLocation:1, rejectReason:1,
      createdAt:1, updatedAt:1,
    };

    const truckFields = {
      id:1, registrationNumber:1, truckType:1, capacity:1,
      loadCapacity:1, truck_status:1, status:1, currentLocation:1,
      contactNumber:1, vehicleBodyType:1, total_tire:1,
      containerFeet:1, routes:1, createdAt:1, updatedAt:1,
    };

    const [
      totalLoads, totalTrucks,
      pendingData, assignedData, deliveredData, cancelledData, allLoads,
      availableData, halfBodyData, returnTruckData, emptyBodyData, allTrucks,
      revenueAgg,
    ] = await Promise.all([
      Load.countDocuments(loadFilter),
      Truck.countDocuments(truckFilter),
      Load.find({ ...loadFilter, status: 'pending' }).sort({ createdAt: -1 }).select(loadFields).lean(),
      Load.find({ ...loadFilter, status: { $in: ['assigned', 'accepted'] } }).sort({ createdAt: -1 }).select(loadFields).lean(),
      Load.find({ ...loadFilter, status: 'delivered' }).sort({ createdAt: -1 }).select(loadFields).lean(),
      Load.find({ ...loadFilter, status: { $in: ['cancelled', 'rejected'] } }).sort({ createdAt: -1 }).select(loadFields).lean(),
      Load.find(loadFilter).sort({ createdAt: -1 }).select(loadFields).lean(),
      Truck.find({ ...truckFilter, $or: [{ status: 'available' }, { status: '' }, { status: { $exists: false } }] }).sort({ createdAt: -1 }).select(truckFields).lean(),
      Load.find({ ...loadFilter, truck_status: 'half body' }).sort({ createdAt: -1 }).select(loadFields).lean(),
      Load.find({ ...loadFilter, truck_status: 'return truck' }).sort({ createdAt: -1 }).select(loadFields).lean(),
      Load.find({ ...loadFilter, truck_status: 'empty body' }).sort({ createdAt: -1 }).select(loadFields).lean(),
      Truck.find(truckFilter).sort({ createdAt: -1 }).select(truckFields).lean(),
      Load.aggregate([
        { $match: { ...loadFilter, price: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$price' }, avg: { $avg: '$price' } } },
      ]),
    ]);

    const revenue   = revenueAgg[0] || { total: 0, avg: 0 };
    const matchRate = totalLoads ? +((deliveredData.length / totalLoads) * 100).toFixed(1) : 0;

    res.json({
      report: 'overview',
      summary: {
        loads: {
          total:     totalLoads,
          pending:   pendingData.length,
          assigned:  assignedData.length,
          delivered: deliveredData.length,
          cancelled: cancelledData.length,
          matchRate: `${matchRate}%`,
        },
        trucks: {
          total:            totalTrucks,
          available:        availableData.length,
          halfBodyLoads:    halfBodyData.length,
          returnTruckLoads: returnTruckData.length,
          emptyBodyLoads:   emptyBodyData.length,
        },
        pricing: {
          totalRevenue:    revenue.total,
          avgPricePerLoad: Math.round(revenue.avg),
        },
      },
      loads: {
        all:       { count: totalLoads,           data: allLoads },
        pending:   { count: pendingData.length,   data: pendingData },
        assigned:  { count: assignedData.length,  data: assignedData },
        delivered: { count: deliveredData.length, data: deliveredData },
        cancelled: { count: cancelledData.length, data: cancelledData },
      },
      trucks: {
        all:         { count: totalTrucks,            data: allTrucks },
        available:   { count: availableData.length,   data: availableData },
        halfBody:    { count: halfBodyData.length,    data: halfBodyData },
        returnTruck: { count: returnTruckData.length, data: returnTruckData },
        emptyBody:   { count: emptyBodyData.length,   data: emptyBodyData },
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Error generating overview', error: err.message });
  }
});

// ─── 2. Load vs Truck Matching ────────────────────────────────────────────────
reportRouter.post('/load-truck-matching', async (req, res) => {
  try {
    const { loadFilter, truckFilter } = parseFilters(req.body);

    const [loadsByDay, trucksByDay, matchedByDay] = await Promise.all([
      Load.aggregate([
        { $match: loadFilter },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, loadsCreated: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Truck.aggregate([
        { $match: truckFilter },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, trucksAvailable: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Load.aggregate([
        { $match: { ...loadFilter, status: { $in: ['assigned', 'accepted', 'delivered'] } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, matchedLoads: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const dateMap = {};
    for (const d of loadsByDay)   { dateMap[d._id] = { date: d._id, loadsCreated: d.loadsCreated, trucksAvailable: 0, matchedLoads: 0 }; }
    for (const d of trucksByDay)  { if (!dateMap[d._id]) dateMap[d._id] = { date: d._id, loadsCreated: 0, trucksAvailable: 0, matchedLoads: 0 }; dateMap[d._id].trucksAvailable = d.trucksAvailable; }
    for (const d of matchedByDay) { if (!dateMap[d._id]) dateMap[d._id] = { date: d._id, loadsCreated: 0, trucksAvailable: 0, matchedLoads: 0 }; dateMap[d._id].matchedLoads = d.matchedLoads; }

    const rows         = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
    const totalLoads   = rows.reduce((s, r) => s + r.loadsCreated, 0);
    const totalMatched = rows.reduce((s, r) => s + r.matchedLoads, 0);

    res.json({
      report: 'load-truck-matching',
      summary: { totalLoads, totalMatched, matchRate: `${totalLoads ? +((totalMatched / totalLoads) * 100).toFixed(1) : 0}%` },
      rows,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error generating report', error: err.message });
  }
});

// ─── 3. Load Status Summary ───────────────────────────────────────────────────
reportRouter.post('/load-status-summary', async (req, res) => {
  try {
    const { loadFilter } = parseFilters(req.body);
    const rows = await Load.aggregate([
      { $match: loadFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { _id: 0, status: '$_id', count: 1 } },
      { $sort: { count: -1 } },
    ]);
    res.json({ report: 'load-status-summary', summary: { total: rows.reduce((s, r) => s + r.count, 0) }, rows });
  } catch (err) {
    res.status(500).json({ message: 'Error generating report', error: err.message });
  }
});

// ─── 4. Truck Status Summary ──────────────────────────────────────────────────
reportRouter.post('/truck-status-summary', async (req, res) => {
  try {
    const { truckFilter } = parseFilters(req.body);
    const rows = await Truck.aggregate([
      { $match: truckFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { _id: 0, status: '$_id', count: 1 } },
      { $sort: { count: -1 } },
    ]);
    res.json({ report: 'truck-status-summary', summary: { total: rows.reduce((s, r) => s + r.count, 0) }, rows });
  } catch (err) {
    res.status(500).json({ message: 'Error generating report', error: err.message });
  }
});

// ─── 5. Truck Body Utilization ────────────────────────────────────────────────
reportRouter.post('/truck-body-utilization', async (req, res) => {
  try {
    const { loadFilter } = parseFilters(req.body);
    const rows = await Load.aggregate([
      { $match: { ...loadFilter, truck_status: { $in: ['half body', 'empty body', 'return truck'] } } },
      { $group: { _id: '$truck_status', count: { $sum: 1 } } },
      { $project: { _id: 0, truckBodyType: '$_id', count: 1 } },
      { $sort: { count: -1 } },
    ]);
    const unspecifiedCount = await Load.countDocuments({
      ...loadFilter,
      $or: [{ truck_status: null }, { truck_status: '' }, { truck_status: { $exists: false } }],
    });
    res.json({
      report: 'truck-body-utilization',
      rows: [...rows, { truckBodyType: 'unspecified / full', count: unspecifiedCount }],
    });
  } catch (err) {
    res.status(500).json({ message: 'Error generating report', error: err.message });
  }
});

// ─── 6. Load Fulfillment Time ─────────────────────────────────────────────────
reportRouter.post('/load-fulfillment-time', async (req, res) => {
  try {
    const { loadFilter } = parseFilters(req.body);
    const { limit, skip } = getPagination(req.body);
    const rows = await Load.aggregate([
      { $match: { ...loadFilter, status: { $in: ['assigned', 'accepted', 'delivered'] }, updatedAt: { $exists: true } } },
      { $addFields: {
        fulfillmentHours: { $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 3600000] },
        routeKey: { $concat: [{ $ifNull: ['$origin', ''] }, ' → ', { $ifNull: ['$destination', ''] }] },
      }},
      { $group: {
        _id: '$routeKey',
        avgFulfillmentHours: { $avg: '$fulfillmentHours' },
        minHours: { $min: '$fulfillmentHours' },
        maxHours: { $max: '$fulfillmentHours' },
        count: { $sum: 1 },
      }},
      { $sort: { count: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $project: {
        _id: 0,
        route: '$_id',
        avgFulfillmentHours: { $round: ['$avgFulfillmentHours', 1] },
        minHours: { $round: ['$minHours', 1] },
        maxHours: { $round: ['$maxHours', 1] },
        count: 1,
      }},
    ]);
    res.json({ report: 'load-fulfillment-time', rows });
  } catch (err) {
    res.status(500).json({ message: 'Error generating report', error: err.message });
  }
});

// ─── 7. Route Popularity ──────────────────────────────────────────────────────
reportRouter.post('/route-popularity', async (req, res) => {
  try {
    const { loadFilter } = parseFilters(req.body);
    const { limit, skip } = getPagination(req.body);
    const rows = await Load.aggregate([
      { $match: loadFilter },
      { $addFields: { routeKey: { $concat: [{ $ifNull: ['$origin', ''] }, ' → ', { $ifNull: ['$destination', ''] }] } } },
      { $group: {
        _id: '$routeKey',
        totalLoads:     { $sum: 1 },
        avgPrice:       { $avg: '$price' },
        deliveredCount: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        cancelledCount: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
      }},
      { $sort: { totalLoads: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $project: { _id: 0, route: '$_id', totalLoads: 1, avgPrice: { $round: ['$avgPrice', 0] }, deliveredCount: 1, cancelledCount: 1 } },
    ]);
    res.json({ report: 'route-popularity', rows });
  } catch (err) {
    res.status(500).json({ message: 'Error generating report', error: err.message });
  }
});

// ─── 8. No-Offer / Unassigned Loads ──────────────────────────────────────────
reportRouter.post('/no-offer-loads', async (req, res) => {
  try {
    const { loadFilter } = parseFilters(req.body);
    const { limit, skip } = getPagination(req.body);

    const filter = { ...loadFilter, status: 'pending' };
    const minHours = parseFloat(req.body.minHoursPending) || 0;
    if (minHours > 0) {
      filter.createdAt = { ...(filter.createdAt || {}), $lte: new Date(Date.now() - minHours * 3600000) };
    }

    const [rows, total] = await Promise.all([
      Load.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit).select(LOAD_SELECT).lean(),
      Load.countDocuments(filter),
    ]);

    const now = Date.now();
    res.json({
      report: 'no-offer-loads',
      total,
      rows: rows.map(l => ({
        loadId:        l.id || String(l._id),
        loadNumber:    l.loadNumber   || null,
        title:         l.title,
        route:         `${l.origin || ''} → ${l.destination || ''}`,
        price:         l.price        || null,
        weight:        l.weight       || null,
        truckType:     l.truckType    || null,
        truckBodyType: l.truck_status || null,
        hoursPending:  +((now - new Date(l.createdAt).getTime()) / 3600000).toFixed(1),
        createdAt:     l.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Error generating report', error: err.message });
  }
});

// ─── 9. Idle Trucks ───────────────────────────────────────────────────────────
reportRouter.post('/idle-trucks', async (req, res) => {
  try {
    const { truckFilter } = parseFilters(req.body);
    const { limit, skip } = getPagination(req.body);

    const filter = {
      ...truckFilter,
      $or: [{ status: 'available' }, { status: '' }, { status: { $exists: false } }],
    };

    const [rows, total] = await Promise.all([
      Truck.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select(TRUCK_SELECT).lean(),
      Truck.countDocuments(filter),
    ]);

    const now = Date.now();
    res.json({
      report: 'idle-trucks',
      total,
      rows: rows.map(t => ({
        truckId:            t.id || String(t._id),
        registrationNumber: t.registrationNumber,
        truckType:          t.truckType,
        capacity:           t.capacity,
        truckBodyType:      t.truck_status    || null,
        currentLocation:    t.currentLocation || null,
        idleHours:          +((now - new Date(t.createdAt).getTime()) / 3600000).toFixed(1),
        createdAt:          t.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Error generating report', error: err.message });
  }
});

// ─── 10. Pricing Comparison ───────────────────────────────────────────────────
reportRouter.post('/pricing-comparison', async (req, res) => {
  try {
    const { loadFilter } = parseFilters(req.body);
    const rows = await Load.aggregate([
      { $match: { ...loadFilter, price: { $gt: 0 } } },
      { $addFields: {
        bodyCategory: { $cond: [
          { $in: ['$truck_status', ['half body', 'empty body', 'return truck']] },
          '$truck_status',
          'full / unspecified',
        ]},
      }},
      { $group: {
        _id:      '$bodyCategory',
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
        count:    { $sum: 1 },
      }},
      { $sort: { avgPrice: -1 } },
      { $project: { _id: 0, truckBodyType: '$_id', avgPrice: { $round: ['$avgPrice', 0] }, minPrice: 1, maxPrice: 1, count: 1 } },
    ]);

    const basePrice = rows.find(r => r.truckBodyType === 'full / unspecified')?.avgPrice || 0;
    res.json({
      report: 'pricing-comparison',
      rows: rows.map(r => ({
        ...r,
        discountVsFullLoad: basePrice && r.truckBodyType !== 'full / unspecified'
          ? `${+((1 - r.avgPrice / basePrice) * 100).toFixed(1)}%`
          : '—',
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Error generating report', error: err.message });
  }
});

// ─── 11. Top Users ────────────────────────────────────────────────────────────
reportRouter.post('/top-users', async (req, res) => {
  try {
    const { loadFilter } = parseFilters(req.body);
    const { limit, skip } = getPagination(req.body);
    const rows = await Load.aggregate([
      { $match: loadFilter },
      { $group: {
        _id:            '$ownerId',
        loadsPosted:    { $sum: 1 },
        totalValue:     { $sum: { $ifNull: ['$price', 0] } },
        deliveredCount: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        cancelledCount: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
      }},
      { $sort: { loadsPosted: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmpty: true } },
      { $project: {
        _id: 0,
        userId:         '$_id',
        name:           { $ifNull: ['$user.name', 'Unknown'] },
        mobile:         { $ifNull: ['$user.mobile', null] },
        company:        { $ifNull: ['$user.company_name', null] },
        loadsPosted:    1,
        totalValue:     1,
        deliveredCount: 1,
        cancelledCount: 1,
      }},
    ]);
    res.json({ report: 'top-users', rows });
  } catch (err) {
    res.status(500).json({ message: 'Error generating report', error: err.message });
  }
});

// ─── 12. Cancellation Summary ─────────────────────────────────────────────────
reportRouter.post('/cancellation-summary', async (req, res) => {
  try {
    const { loadFilter } = parseFilters(req.body);
    const [byReason, byDay] = await Promise.all([
      Load.aggregate([
        { $match: { ...loadFilter, status: { $in: ['cancelled', 'rejected'] } } },
        { $group: { _id: { $ifNull: ['$rejectReason', 'No reason given'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { _id: 0, reason: '$_id', count: 1 } },
      ]),
      Load.aggregate([
        { $match: { ...loadFilter, status: { $in: ['cancelled', 'rejected'] } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', count: 1 } },
      ]),
    ]);
    res.json({
      report: 'cancellation-summary',
      summary: { totalCancellations: byReason.reduce((s, r) => s + r.count, 0) },
      byReason,
      byDay,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error generating report', error: err.message });
  }
});

// ─── 13. Daily Activity ───────────────────────────────────────────────────────
reportRouter.post('/daily-activity', async (req, res) => {
  try {
    const { loadFilter } = parseFilters(req.body);
    const rows = await Load.aggregate([
      { $match: loadFilter },
      { $group: {
        _id:          { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        created:      { $sum: 1 },
        assigned:     { $sum: { $cond: [{ $eq: ['$status', 'assigned'] }, 1, 0] } },
        accepted:     { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
        delivered:    { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        cancelled:    { $sum: { $cond: [{ $in: ['$status', ['cancelled', 'rejected']] }, 1, 0] } },
        totalRevenue: { $sum: { $ifNull: ['$price', 0] } },
      }},
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', created: 1, assigned: 1, accepted: 1, delivered: 1, cancelled: 1, totalRevenue: 1 } },
    ]);
    const summary = rows.reduce(
      (acc, r) => {
        acc.totalCreated   += r.created;
        acc.totalDelivered += r.delivered;
        acc.totalCancelled += r.cancelled;
        acc.totalRevenue   += r.totalRevenue;
        return acc;
      },
      { totalCreated: 0, totalDelivered: 0, totalCancelled: 0, totalRevenue: 0 }
    );
    res.json({ report: 'daily-activity', summary, rows });
  } catch (err) {
    res.status(500).json({ message: 'Error generating report', error: err.message });
  }
});

// ─── 14. Material Demand ──────────────────────────────────────────────────────
reportRouter.post('/material-demand', async (req, res) => {
  try {
    const { loadFilter } = parseFilters(req.body);
    const { limit, skip } = getPagination(req.body);
    const rows = await Load.aggregate([
      { $match: { ...loadFilter, material: { $exists: true, $ne: '' } } },
      { $group: {
        _id:            '$material',
        count:          { $sum: 1 },
        avgPrice:       { $avg: '$price' },
        deliveredCount: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
      }},
      { $sort: { count: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $project: { _id: 0, material: '$_id', count: 1, avgPrice: { $round: ['$avgPrice', 0] }, deliveredCount: 1 } },
    ]);
    res.json({ report: 'material-demand', rows });
  } catch (err) {
    res.status(500).json({ message: 'Error generating report', error: err.message });
  }
});

// ─── 15. Vehicle Type Demand ──────────────────────────────────────────────────
reportRouter.post('/vehicle-type-demand', async (req, res) => {
  try {
    const { loadFilter } = parseFilters(req.body);
    const { limit, skip } = getPagination(req.body);
    const rows = await Load.aggregate([
      { $match: { ...loadFilter, vehicleType: { $exists: true, $ne: '' } } },
      { $group: {
        _id:            '$vehicleType',
        count:          { $sum: 1 },
        avgPrice:       { $avg: '$price' },
        deliveredCount: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        cancelledCount: { $sum: { $cond: [{ $in: ['$status', ['cancelled', 'rejected']] }, 1, 0] } },
      }},
      { $sort: { count: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $project: { _id: 0, vehicleType: '$_id', count: 1, avgPrice: { $round: ['$avgPrice', 0] }, deliveredCount: 1, cancelledCount: 1 } },
    ]);
    res.json({ report: 'vehicle-type-demand', rows });
  } catch (err) {
    res.status(500).json({ message: 'Error generating report', error: err.message });
  }
});

// ─── LOAD DOWNLOAD ROUTES ─────────────────────────────────────────────────────

reportRouter.post('/download/all-loads', async (req, res) => {
  try {
    const { loadFilter } = parseFilters(req.body);
    const rows = await Load.find(loadFilter).sort({ createdAt: -1 }).select(LOAD_SELECT).lean();
    await sendExcel(res, 'all-loads', LOAD_HEADERS, rows.map(loadToRow));
  } catch (err) { res.status(500).json({ message: 'Error downloading all loads', error: err.message }); }
});

reportRouter.post('/download/pending-loads', async (req, res) => {
  try {
    const { loadFilter } = parseFilters(req.body);
    const rows = await Load.find({ ...loadFilter, status: 'pending' }).sort({ createdAt: -1 }).select(LOAD_SELECT).lean();
    await sendExcel(res, 'pending-loads', LOAD_HEADERS, rows.map(loadToRow));
  } catch (err) { res.status(500).json({ message: 'Error downloading pending loads', error: err.message }); }
});

reportRouter.post('/download/assigned-loads', async (req, res) => {
  try {
    const { loadFilter } = parseFilters(req.body);
    const rows = await Load.find({ ...loadFilter, status: { $in: ['assigned', 'accepted'] } }).sort({ createdAt: -1 }).select(LOAD_SELECT).lean();
    await sendExcel(res, 'assigned-loads', LOAD_HEADERS, rows.map(loadToRow));
  } catch (err) { res.status(500).json({ message: 'Error downloading assigned loads', error: err.message }); }
});

reportRouter.post('/download/delivered-loads', async (req, res) => {
  try {
    const { loadFilter } = parseFilters(req.body);
    const rows = await Load.find({ ...loadFilter, status: 'delivered' }).sort({ createdAt: -1 }).select(LOAD_SELECT).lean();
    await sendExcel(res, 'delivered-loads', LOAD_HEADERS, rows.map(loadToRow));
  } catch (err) { res.status(500).json({ message: 'Error downloading delivered loads', error: err.message }); }
});

reportRouter.post('/download/cancelled-loads', async (req, res) => {
  try {
    const { loadFilter } = parseFilters(req.body);
    const rows = await Load.find({ ...loadFilter, status: { $in: ['cancelled', 'rejected'] } }).sort({ createdAt: -1 }).select(LOAD_SELECT).lean();
    await sendExcel(res, 'cancelled-loads', LOAD_HEADERS, rows.map(loadToRow));
  } catch (err) { res.status(500).json({ message: 'Error downloading cancelled loads', error: err.message }); }
});

reportRouter.post('/download/all-trucks', async (req, res) => {
  try {
    const { truckFilter } = parseFilters(req.body);
    const rows = await Truck.find(truckFilter).sort({ createdAt: -1 }).select(TRUCK_SELECT).lean();
    await sendExcel(res, 'all-trucks', TRUCK_HEADERS, rows.map(truckToRow));
  } catch (err) { res.status(500).json({ message: 'Error downloading all trucks', error: err.message }); }
});

reportRouter.post('/download/available-trucks', async (req, res) => {
  try {
    const { truckFilter } = parseFilters(req.body);
    const rows = await Truck.find({
      ...truckFilter,
      $or: [{ status: 'available' }, { status: '' }, { status: { $exists: false } }],
    }).sort({ createdAt: -1 }).select(TRUCK_SELECT).lean();
    await sendExcel(res, 'available-trucks', TRUCK_HEADERS, rows.map(truckToRow));
  } catch (err) { res.status(500).json({ message: 'Error downloading available trucks', error: err.message }); }
});

reportRouter.post('/download/half-body-loads', async (req, res) => {
  try {
    const { loadFilter } = parseFilters(req.body);
    const rows = await Load.find({ ...loadFilter, truck_status: 'half body' }).sort({ createdAt: -1 }).select(LOAD_SELECT).lean();
    await sendExcel(res, 'half-body-loads', LOAD_HEADERS, rows.map(loadToRow));
  } catch (err) { res.status(500).json({ message: 'Error downloading half body loads', error: err.message }); }
});

reportRouter.post('/download/return-truck-loads', async (req, res) => {
  try {
    const { loadFilter } = parseFilters(req.body);
    const rows = await Load.find({ ...loadFilter, truck_status: 'return truck' }).sort({ createdAt: -1 }).select(LOAD_SELECT).lean();
    await sendExcel(res, 'return-truck-loads', LOAD_HEADERS, rows.map(loadToRow));
  } catch (err) { res.status(500).json({ message: 'Error downloading return truck loads', error: err.message }); }
});

reportRouter.post('/download/overview', async (req, res) => {
  try {
    const { loadFilter, truckFilter } = parseFilters(req.body);
    const type = req.body.type || 'loads';

    if (type === 'trucks') {
      const rows = await Truck.find(truckFilter).sort({ createdAt: -1 }).select(TRUCK_SELECT).lean();
      return await sendExcel(res, 'all-trucks', TRUCK_HEADERS, rows.map(truckToRow));
    }

    if (type === 'available-trucks') {
      const rows = await Truck.find({
        ...truckFilter,
        $or: [{ status: 'available' }, { status: '' }, { status: { $exists: false } }],
      }).sort({ createdAt: -1 }).select(TRUCK_SELECT).lean();
      return await sendExcel(res, 'available-trucks', TRUCK_HEADERS, rows.map(truckToRow));
    }

    const loadTypeMap = {
      'pending':      { filter: { ...loadFilter, status: 'pending' },                         name: 'pending-loads' },
      'assigned':     { filter: { ...loadFilter, status: { $in: ['assigned', 'accepted'] } }, name: 'assigned-loads' },
      'delivered':    { filter: { ...loadFilter, status: 'delivered' },                        name: 'delivered-loads' },
      'cancelled':    { filter: { ...loadFilter, status: { $in: ['cancelled', 'rejected'] } }, name: 'cancelled-loads' },
      'half-body':    { filter: { ...loadFilter, truck_status: 'half body' },                  name: 'half-body-loads' },
      'return-truck': { filter: { ...loadFilter, truck_status: 'return truck' },               name: 'return-truck-loads' },
      'loads':        { filter: loadFilter,                                                     name: 'all-loads' },
    };

    const config = loadTypeMap[type] || loadTypeMap['loads'];
    const rows   = await Load.find(config.filter).sort({ createdAt: -1 }).select(LOAD_SELECT).lean();
    await sendExcel(res, config.name, LOAD_HEADERS, rows.map(loadToRow));
  } catch (err) {
    res.status(500).json({ message: 'Error downloading overview data', error: err.message });
  }
});

// ─── BUYSELL ROUTES ───────────────────────────────────────────────────────────

// B1. Buy/Sell Overview Summary
reportRouter.post('/buysell-summary', async (req, res) => {
  try {
    const filter = parseBuySellFilters(req.body);
    const [total, buyCount, sellCount, activeCount, inactiveCount, recentListings] = await Promise.all([
      BuySell.countDocuments(filter),
      BuySell.countDocuments({ ...filter, user_type: 'buy' }),
      BuySell.countDocuments({ ...filter, user_type: 'sell' }),
      BuySell.countDocuments({ ...filter, status: 'Active' }),
      BuySell.countDocuments({ ...filter, status: 'Inactive' }),
      BuySell.find(filter).sort({ createdAt: -1 }).limit(20).select(BUYSELL_SELECT).lean(),
    ]);
    res.json({
      report: 'buysell-summary',
      summary: {
        total,
        byType:   { buy: buyCount,       sell: sellCount },
        byStatus: { active: activeCount, inactive: inactiveCount },
      },
      recentListings,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error generating buy/sell summary', error: err.message });
  }
});

// B2. Buy/Sell Status Summary
reportRouter.post('/buysell-status-summary', async (req, res) => {
  try {
    const filter = parseBuySellFilters(req.body);
    const rows = await BuySell.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { _id: 0, status: '$_id', count: 1 } },
      { $sort: { count: -1 } },
    ]);
    res.json({
      report: 'buysell-status-summary',
      summary: { total: rows.reduce((s, r) => s + r.count, 0) },
      rows,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error generating buy/sell status summary', error: err.message });
  }
});

// B3. Buy/Sell Type Summary
reportRouter.post('/buysell-type-summary', async (req, res) => {
  try {
    const filter = parseBuySellFilters(req.body);
    const rows = await BuySell.aggregate([
      { $match: filter },
      { $group: {
        _id:           '$user_type',
        total:         { $sum: 1 },
        activeCount:   { $sum: { $cond: [{ $eq: ['$status', 'Active'] },   1, 0] } },
        inactiveCount: { $sum: { $cond: [{ $eq: ['$status', 'Inactive'] }, 1, 0] } },
      }},
      { $project: { _id: 0, user_type: '$_id', total: 1, activeCount: 1, inactiveCount: 1 } },
      { $sort: { total: -1 } },
    ]);
    res.json({ report: 'buysell-type-summary', rows });
  } catch (err) {
    res.status(500).json({ message: 'Error generating buy/sell type summary', error: err.message });
  }
});

// B4. Buy/Sell Daily Activity
reportRouter.post('/buysell-daily-activity', async (req, res) => {
  try {
    const filter = parseBuySellFilters(req.body);
    const rows = await BuySell.aggregate([
      { $match: filter },
      { $group: {
        _id:       { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        created:   { $sum: 1 },
        buyCount:  { $sum: { $cond: [{ $eq: ['$user_type', 'buy'] },  1, 0] } },
        sellCount: { $sum: { $cond: [{ $eq: ['$user_type', 'sell'] }, 1, 0] } },
        active:    { $sum: { $cond: [{ $eq: ['$status', 'Active'] },  1, 0] } },
      }},
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', created: 1, buyCount: 1, sellCount: 1, active: 1 } },
    ]);
    const summary = rows.reduce(
      (acc, r) => { acc.totalCreated += r.created; acc.totalBuy += r.buyCount; acc.totalSell += r.sellCount; return acc; },
      { totalCreated: 0, totalBuy: 0, totalSell: 0 }
    );
    res.json({ report: 'buysell-daily-activity', summary, rows });
  } catch (err) {
    res.status(500).json({ message: 'Error generating buy/sell daily activity', error: err.message });
  }
});

// ─── NEW B10. Category-wise vehicles posted for SELL ──────────────────────────
// Groups sell listings by category_id + subcategory_id, enriches with names.
reportRouter.post('/buysell-category-posted', async (req, res) => {
  try {
    const filter     = parseBuySellFilters(req.body);
    const sellFilter = { ...filter, user_type: 'sell' };

    const rows = await BuySell.aggregate([
      { $match: sellFilter },
      { $group: {
        _id:           { categoryId: '$category_id', subcategoryId: '$subcategory_id' },
        totalPosted:   { $sum: 1 },
        activeCount:   { $sum: { $cond: [{ $eq: ['$status', 'Active'] },   1, 0] } },
        inactiveCount: { $sum: { $cond: [{ $eq: ['$status', 'Inactive'] }, 1, 0] } },
        avgPrice:      { $avg:  { $ifNull: ['$price', 0] } },
        minPrice:      { $min:  { $ifNull: ['$price', 0] } },
        maxPrice:      { $max:  { $ifNull: ['$price', 0] } },
      }},
      { $sort: { totalPosted: -1 } },
      { $project: {
        _id:           0,
        categoryId:    '$_id.categoryId',
        subcategoryId: '$_id.subcategoryId',
        totalPosted:   1, activeCount: 1, inactiveCount: 1,
        avgPrice: { $round: ['$avgPrice', 0] }, minPrice: 1, maxPrice: 1,
      }},
    ]);

    const enriched = await enrichWithCategoryNames(rows);
    const summary  = {
      totalPosted:   enriched.reduce((s, r) => s + r.totalPosted,   0),
      totalActive:   enriched.reduce((s, r) => s + r.activeCount,   0),
      totalInactive: enriched.reduce((s, r) => s + r.inactiveCount, 0),
      categories:    enriched.length,
    };

    res.json({ report: 'buysell-category-posted', summary, rows: enriched });
  } catch (err) {
    res.status(500).json({ message: 'Error generating category posted report', error: err.message });
  }
});

// ─── NEW B11. Category-wise vehicles SOLD (Inactive sell listings) ────────────
reportRouter.post('/buysell-category-sold', async (req, res) => {
  try {
    const filter     = parseBuySellFilters(req.body);
    const soldFilter = { ...filter, user_type: 'sell', status: 'Inactive' };

    const rows = await BuySell.aggregate([
      { $match: soldFilter },
      { $group: {
        _id:       { categoryId: '$category_id', subcategoryId: '$subcategory_id' },
        totalSold: { $sum: 1 },
        avgPrice:  { $avg: { $ifNull: ['$price', 0] } },
        minPrice:  { $min: { $ifNull: ['$price', 0] } },
        maxPrice:  { $max: { $ifNull: ['$price', 0] } },
      }},
      { $sort: { totalSold: -1 } },
      { $project: {
        _id:           0,
        categoryId:    '$_id.categoryId',
        subcategoryId: '$_id.subcategoryId',
        totalSold:    1,
        avgPrice: { $round: ['$avgPrice', 0] }, minPrice: 1, maxPrice: 1,
      }},
    ]);

    const enriched = await enrichWithCategoryNames(rows);
    const summary  = {
      totalSold:  enriched.reduce((s, r) => s + r.totalSold, 0),
      categories: enriched.length,
    };

    res.json({ report: 'buysell-category-sold', summary, rows: enriched });
  } catch (err) {
    res.status(500).json({ message: 'Error generating category sold report', error: err.message });
  }
});

// ─── BUYSELL DOWNLOAD ROUTES ──────────────────────────────────────────────────

// B5. Download: All listings
reportRouter.post('/download/all-buysell', async (req, res) => {
  try {
    const filter = parseBuySellFilters(req.body);
    const rows = await BuySell.find(filter).sort({ createdAt: -1 }).select(BUYSELL_SELECT).lean();
    await sendExcel(res, 'all-buysell', BUYSELL_HEADERS, rows.map(buySellToRow));
  } catch (err) {
    res.status(500).json({ message: 'Error downloading all buy/sell listings', error: err.message });
  }
});

// B6. Download: Buy listings only
reportRouter.post('/download/buy-listings', async (req, res) => {
  try {
    const filter = parseBuySellFilters(req.body);
    const rows = await BuySell.find({ ...filter, user_type: 'buy' }).sort({ createdAt: -1 }).select(BUYSELL_SELECT).lean();
    await sendExcel(res, 'buy-listings', BUYSELL_HEADERS, rows.map(buySellToRow));
  } catch (err) {
    res.status(500).json({ message: 'Error downloading buy listings', error: err.message });
  }
});

// B7. Download: Sell listings only
reportRouter.post('/download/sell-listings', async (req, res) => {
  try {
    const filter = parseBuySellFilters(req.body);
    const rows = await BuySell.find({ ...filter, user_type: 'sell' }).sort({ createdAt: -1 }).select(BUYSELL_SELECT).lean();
    await sendExcel(res, 'sell-listings', BUYSELL_HEADERS, rows.map(buySellToRow));
  } catch (err) {
    res.status(500).json({ message: 'Error downloading sell listings', error: err.message });
  }
});

// B8. Download: Active listings only
reportRouter.post('/download/active-buysell', async (req, res) => {
  try {
    const filter = parseBuySellFilters(req.body);
    const rows = await BuySell.find({ ...filter, status: 'Active' }).sort({ createdAt: -1 }).select(BUYSELL_SELECT).lean();
    await sendExcel(res, 'active-buysell', BUYSELL_HEADERS, rows.map(buySellToRow));
  } catch (err) {
    res.status(500).json({ message: 'Error downloading active buy/sell listings', error: err.message });
  }
});

// B9. Download: Inactive listings only
reportRouter.post('/download/inactive-buysell', async (req, res) => {
  try {
    const filter = parseBuySellFilters(req.body);
    const rows = await BuySell.find({ ...filter, status: 'Inactive' }).sort({ createdAt: -1 }).select(BUYSELL_SELECT).lean();
    await sendExcel(res, 'inactive-buysell', BUYSELL_HEADERS, rows.map(buySellToRow));
  } catch (err) {
    res.status(500).json({ message: 'Error downloading inactive buy/sell listings', error: err.message });
  }
});

// NEW B12. Download: Category-wise posted vehicles (sell)
reportRouter.post('/download/buysell-category-posted', async (req, res) => {
  try {
    const filter     = parseBuySellFilters(req.body);
    const sellFilter = { ...filter, user_type: 'sell' };

    const rows = await BuySell.aggregate([
      { $match: sellFilter },
      { $group: {
        _id:           { categoryId: '$category_id', subcategoryId: '$subcategory_id' },
        totalPosted:   { $sum: 1 },
        activeCount:   { $sum: { $cond: [{ $eq: ['$status', 'Active'] },   1, 0] } },
        inactiveCount: { $sum: { $cond: [{ $eq: ['$status', 'Inactive'] }, 1, 0] } },
        avgPrice:      { $avg: { $ifNull: ['$price', 0] } },
        minPrice:      { $min: { $ifNull: ['$price', 0] } },
        maxPrice:      { $max: { $ifNull: ['$price', 0] } },
      }},
      { $sort: { totalPosted: -1 } },
      { $project: {
        _id: 0,
        categoryId:    '$_id.categoryId',
        subcategoryId: '$_id.subcategoryId',
        totalPosted: 1, activeCount: 1, inactiveCount: 1,
        avgPrice: { $round: ['$avgPrice', 0] }, minPrice: 1, maxPrice: 1,
      }},
    ]);

    const enriched = await enrichWithCategoryNames(rows);
    await sendExcel(res, 'category-posted-sell', CATEGORY_SELL_HEADERS, enriched.map(categorySellToRow));
  } catch (err) {
    res.status(500).json({ message: 'Error downloading category posted report', error: err.message });
  }
});

// NEW B13. Download: Category-wise sold vehicles
reportRouter.post('/download/buysell-category-sold', async (req, res) => {
  try {
    const filter     = parseBuySellFilters(req.body);
    const soldFilter = { ...filter, user_type: 'sell', status: 'Inactive' };

    const rows = await BuySell.aggregate([
      { $match: soldFilter },
      { $group: {
        _id:       { categoryId: '$category_id', subcategoryId: '$subcategory_id' },
        totalSold: { $sum: 1 },
        avgPrice:  { $avg: { $ifNull: ['$price', 0] } },
        minPrice:  { $min: { $ifNull: ['$price', 0] } },
        maxPrice:  { $max: { $ifNull: ['$price', 0] } },
      }},
      { $sort: { totalSold: -1 } },
      { $project: {
        _id: 0,
        categoryId:    '$_id.categoryId',
        subcategoryId: '$_id.subcategoryId',
        totalSold: 1,
        avgPrice: { $round: ['$avgPrice', 0] }, minPrice: 1, maxPrice: 1,
      }},
    ]);

    const enriched = await enrichWithCategoryNames(rows);
    await sendExcel(res, 'category-sold', CATEGORY_SOLD_HEADERS, enriched.map(categorySoldToRow));
  } catch (err) {
    res.status(500).json({ message: 'Error downloading category sold report', error: err.message });
  }
});

module.exports = reportRouter;