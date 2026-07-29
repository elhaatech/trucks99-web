'use strict';

/**
 * Match API — ENHANCED WITH DEBUGGING
 * 
 * Returns complete Truck/Load objects + matchedOn criteria
 * PLUS debugging info to diagnose auth/data issues
 */

const express    = require('express');
const mongoose   = require('mongoose');
const Load       = require('../schema/load');
const Truck      = require('../schema/truck');
const User       = require('../schema/user');
const { resolveToObjectId } = require('../helpers/uuidHelper');

const matchRouter = express.Router();

// ─── Enhanced Auth Guard with Debugging ────────────────────────────────

function requireAuth(req, res, next) {
  // 1. Check for token in Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader?.replace('Bearer ', '');
  
  console.log('=== AUTH DEBUG ===');
  console.log('Authorization header:', authHeader ? '✓ Present' : '❌ MISSING');
  console.log('Token:', token ? `✓ Found (${token.substring(0, 20)}...)` : '❌ MISSING');

  // 2. Check req.user (set by JWT middleware)
  const userId = req.user?._id || req.user?.id || req.user?.userId;
  console.log('req.user:', req.user ? `✓ ${JSON.stringify(req.user, null, 2)}` : '❌ NOT SET');
  console.log('Extracted userId:', userId ? `✓ ${userId}` : '❌ MISSING');

  if (!userId) {
    console.log('❌ Auth failed: No userId found');
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized. Please log in.',
      debug: {
        authHeaderPresent: !!authHeader,
        tokenPresent: !!token,
        reqUserPresent: !!req.user,
        extractedUserId: null,
      }
    });
  }

  console.log('✓ Auth passed\n');
  next();
}

matchRouter.use(requireAuth);

// ─── helpers ──────────────────────────────────────────────────────────

function getLat(loc) {
  if (!loc || typeof loc !== 'object') return undefined;
  const v = loc.lat;
  return v != null ? (typeof v === 'number' ? v : parseFloat(String(v))) : undefined;
}

function getLng(loc) {
  if (!loc || typeof loc !== 'object') return undefined;
  const v = loc.lng ?? loc.lang;
  return v != null ? (typeof v === 'number' ? v : parseFloat(String(v))) : undefined;
}

function extractAddress(loc) {
  if (!loc) return '';
  if (typeof loc === 'string') return loc.trim();
  return String(loc?.address ?? loc?.addresses ?? loc?.formatted_address ?? '').trim();
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseCapacity(s) {
  if (s == null) return undefined;
  const n = parseFloat(String(s).replace(/[^\d.]/g, ''));
  return isNaN(n) ? undefined : n;
}

// ─── Normalization helpers (root-cause fixes) ─────────────────────────

// Extracts a comparable identifier whether the field is a raw UUID string,
// a Mongo ObjectId, or a populated object ({ _id, uuid, name }). Without
// .populate() in this router, truck.vehicleType/vehicleBodyType etc. will
// most likely be raw strings — but this guards against either shape.
function normalizeId(value) {
  if (value == null) return '';
  if (typeof value === 'object') {
    if (value instanceof mongoose.Types.ObjectId) return String(value).toLowerCase().trim();
    return String(value.uuid ?? value._id ?? value.id ?? value.name ?? '').toLowerCase().trim();
  }
  return String(value).toLowerCase().trim();
}

// Extracts the first numeric run from a value, so "24", "24 ft", 24,
// "6 Tyres", "10" all normalize to comparable numbers instead of failing
// strict === checks due to unit suffixes or string/number type mismatches.
function parseNumeric(value) {
  if (value == null || value === '') return null;
  const n = parseFloat(String(value).replace(/[^\d.]/g, ''));
  return isNaN(n) ? null : n;
}

// ─── Scoring (rewritten: explicit per-field comparators + debug trace) ─

function compareTruckLoad(truck, load, radiusKm = 50) {
  let score = 0;
  const matchedOn = [];
  const comparisons = {}; // field -> { pass, truckValue, loadValue, reason }

  // --- Vehicle Type ---
  // Root cause #1 fixed below: truck.vehicleType, when NOT populated, is
  // just an id (string or ObjectId) — truck.vehicleType?.uuid only exists
  // if .populate() ran, which this router never calls. normalizeId()
  // handles both shapes so we don't silently get `undefined` here.
  const truckVTypeIds = [truck.truckType, truck.vehicleType, truck.vehicleTypeId]
    .map(normalizeId).filter(Boolean);
  const loadVTypeIds = [load.vehicleType, load.truckType, load.vehicleTypeId]
    .map(normalizeId).filter(Boolean);
  const vehicleTypePass = truckVTypeIds.length > 0 && loadVTypeIds.length > 0 &&
    truckVTypeIds.some(t => loadVTypeIds.includes(t));
  comparisons.vehicleType = {
    pass: vehicleTypePass,
    truckValue: truckVTypeIds.join(' | ') || '(none)',
    loadValue: loadVTypeIds.join(' | ') || '(none)',
    reason: vehicleTypePass ? null
      : (!truckVTypeIds.length ? 'truck has no vehicleType/truckType id'
        : !loadVTypeIds.length ? 'load has no vehicleType id'
        : 'ids present on both sides but none matched'),
  };
  if (vehicleTypePass) { score += 20; matchedOn.push('Vehicle type'); }

  // --- Vehicle Body Type ---
  const truckVBT = normalizeId(truck.vehicleBodyType);
  const loadVBT  = normalizeId(load.vehicleBodyType);
  const vbtPass = !!truckVBT && !!loadVBT && truckVBT === loadVBT;
  comparisons.vehicleBodyType = {
    pass: vbtPass,
    truckValue: truckVBT || '(none)',
    loadValue: loadVBT || '(none)',
    reason: vbtPass ? null
      : (!truckVBT ? 'truck.vehicleBodyType is empty'
        : !loadVBT ? 'load.vehicleBodyType is empty'
        : 'values present but not equal'),
  };
  if (vbtPass) { score += 10; matchedOn.push('Vehicle body type'); }

  // --- Capacity ---
  // Root cause #2 fixed: was comparing truck.capacity against
  // load.vehicleCapacity (the vehicle category's standard rated capacity)
  // BEFORE falling back to load.loadCapacity (what the shipper actually
  // needs moved). vehicleCapacity is usually larger and unrelated to the
  // specific load, so it produced false rejections. Now loadCapacity is
  // checked first, per spec.
  const tCap = parseNumeric(truck.capacity);
  const lCap = parseNumeric(load.loadCapacity ?? load.weight ?? load.vehicleCapacity);
  const capacityPass = tCap != null && lCap != null && tCap >= lCap;
  comparisons.capacity = {
    pass: capacityPass,
    truckValue: tCap ?? '(none)',
    loadValue: lCap ?? '(none)',
    reason: capacityPass ? null
      : (tCap == null ? 'truck.capacity is missing/non-numeric'
        : lCap == null ? 'load.loadCapacity is missing/non-numeric'
        : `truck capacity (${tCap}) < load capacity (${lCap})`),
  };
  if (capacityPass) { score += 10; matchedOn.push('Capacity'); }

  // --- Container Feet ---
  // Root cause #3 fixed: was strict String === String, which breaks on
  // "24 ft" vs "24". Now parsed numerically before comparing.
  const tContainer = parseNumeric(truck.containerFeet);
  const lContainer = parseNumeric(load.containerFeet);
  const containerPass = tContainer != null && lContainer != null && tContainer === lContainer;
  comparisons.containerFeet = {
    pass: containerPass,
    truckValue: tContainer ?? '(none)',
    loadValue: lContainer ?? '(none)',
    reason: containerPass ? null
      : (tContainer == null ? 'truck.containerFeet is missing/non-numeric'
        : lContainer == null ? 'load.containerFeet is missing/non-numeric'
        : `${tContainer} ft != ${lContainer} ft`),
  };
  if (containerPass) { score += 5; matchedOn.push('Container feet'); }

  // --- Total Tyres ---
  // Root cause #4 fixed: the field is stored as `total_tire` on both
  // schemas — the old code read truck.totalTyres / truck.wheels, fields
  // that do not exist, so this comparison ALWAYS silently failed and
  // never contributed score, regardless of how many loads actually
  // matched on tyre count. Also normalized numerically ("6 Tyres" vs "6").
  const tTyres = parseNumeric(truck.total_tire ?? truck.totalTyres ?? truck.wheels);
  const lTyres = parseNumeric(load.total_tire ?? load.totalTyres ?? load.wheels);
  const tyresPass = tTyres != null && lTyres != null && tTyres === lTyres;
  comparisons.totalTyres = {
    pass: tyresPass,
    truckValue: tTyres ?? '(none)',
    loadValue: lTyres ?? '(none)',
    reason: tyresPass ? null
      : (tTyres == null ? 'truck.total_tire is missing/non-numeric'
        : lTyres == null ? 'load.total_tire is missing/non-numeric'
        : `${tTyres} != ${lTyres}`),
  };
  if (tyresPass) { score += 5; matchedOn.push('Total tyres'); }

  // --- Pickup / Drop Location ---
  // Trucks here typically only carry currentLocation (no fixed dropLocation
  // / routes), so we score pickup and drop independently rather than
  // requiring both — a truck's currentLocation is compared against the
  // load's pickup, and (if present) the truck's dropLocation/routes/stops
  // are compared against the load's drop.
  const truckPickText = [
    ...(Array.isArray(truck.routes) ? truck.routes.map(r => extractAddress(r.from)) : []),
    truck.currentLocation || '',
    ...(Array.isArray(truck.stop_all) ? truck.stop_all.map(s => extractAddress(s)) : []),
  ].filter(Boolean).join(' ').toLowerCase();
  const loadPickText = [extractAddress(load.pickupLocation), load.origin || '']
    .filter(Boolean).join(' ').toLowerCase();

  let pickupPass = false, pickupReason = 'no overlapping location text';
  if (!truckPickText) pickupReason = 'truck has no currentLocation/routes/stop_all to compare';
  else if (!loadPickText) pickupReason = 'load has no pickupLocation/origin to compare';
  else {
    const words   = loadPickText.split(/\s+/).map(w => w.replace(/[.,]/g, '')).filter(w => w.length > 2);
    const cleanedTruckText = truckPickText.replace(/[.,]/g, '');
    const matched = words.filter(w => cleanedTruckText.includes(w)).length;
    if (matched > 0) {
      pickupPass = true;
      score += Math.round(20 * matched / words.length);
      matchedOn.push('Pickup location');
      pickupReason = null;
    }
  }
  comparisons.pickupLocation = {
    pass: pickupPass,
    truckValue: truckPickText || '(none)',
    loadValue: loadPickText || '(none)',
    reason: pickupReason,
  };

  const truckDropText = [
    ...(Array.isArray(truck.routes) ? truck.routes.map(r => extractAddress(r.to)) : []),
    truck.dropLocation || '',
    ...(Array.isArray(truck.stop_all) ? truck.stop_all.map(s => extractAddress(s)) : []),
  ].filter(Boolean).join(' ').toLowerCase();
  const loadDropText = [extractAddress(load.dropLocation), load.destination || '']
    .filter(Boolean).join(' ').toLowerCase();

  let dropPass = false, dropReason = 'no overlapping location text';
  if (!truckDropText) dropReason = 'truck has no dropLocation/routes/stop_all to compare (transporter trucks often track only currentLocation)';
  else if (!loadDropText) dropReason = 'load has no dropLocation/destination to compare';
  else {
    const words   = loadDropText.split(/\s+/).map(w => w.replace(/[.,]/g, '')).filter(w => w.length > 2);
    const cleanedTruckText = truckDropText.replace(/[.,]/g, '');
    const matched = words.filter(w => cleanedTruckText.includes(w)).length;
    if (matched > 0) {
      dropPass = true;
      score += Math.round(20 * matched / words.length);
      matchedOn.push('Drop location');
      dropReason = null;
    }
  }
  comparisons.dropLocation = {
    pass: dropPass,
    truckValue: truckDropText || '(none)',
    loadValue: loadDropText || '(none)',
    reason: dropReason,
  };

  // --- GPS / route proximity bonus (kept from original logic) ---
  const loadPickLat = getLat(load.pickupLocation);
  const loadPickLng = getLng(load.pickupLocation);
  const loadDropLat = getLat(load.dropLocation);
  const loadDropLng = getLng(load.dropLocation);
  if (Array.isArray(truck.routes)) {
    let pts = 0;
    for (const r of truck.routes) {
      const fLat = getLat(r.from), fLng = getLng(r.from);
      const tLat = getLat(r.to),   tLng = getLng(r.to);
      if (loadPickLat != null && fLat != null && haversineKm(loadPickLat, loadPickLng, fLat, fLng) <= radiusKm) pts += 10;
      if (loadDropLat != null && tLat != null && haversineKm(loadDropLat, loadDropLng, tLat, tLng) <= radiusKm) pts += 10;
    }
    if (pts > 0) { score += Math.min(20, pts); matchedOn.push('GPS/Route proximity'); }
  }

  return { score: Math.min(score, 100), matchedOn, comparisons };
}

// Pretty-prints the exact debug block requested for diagnosing rejected
// matches: truck fields, load fields, PASS/FAIL per criterion, final score,
// and an explicit rejection reason when applicable.
function logMatchDebug(truck, load, result, minScore) {
  const c = result.comparisons;
  const accepted = result.score >= minScore;
  console.log('----------------------------------------------------');
  console.log('Truck:');
  console.log(`- Truck Number: ${truck.truckNumber || truck.registrationNumber || truck._id}`);
  console.log(`- Vehicle Type: ${c.vehicleType.truckValue}`);
  console.log(`- Vehicle Body Type: ${c.vehicleBodyType.truckValue}`);
  console.log(`- Capacity: ${truck.capacity}`);
  console.log(`- Container Feet: ${truck.containerFeet}`);
  console.log(`- Total Tyres: ${truck.total_tire ?? truck.totalTyres ?? truck.wheels}`);
  console.log(`- Current Location: ${truck.currentLocation || '(none)'}`);
  console.log('Load:');
  console.log(`- Load Number: ${load.loadNumber || load._id}`);
  console.log(`- Vehicle Type: ${c.vehicleType.loadValue}`);
  console.log(`- Vehicle Body Type: ${c.vehicleBodyType.loadValue}`);
  console.log(`- Load Capacity: ${load.loadCapacity}`);
  console.log(`- Container Feet: ${load.containerFeet}`);
  console.log(`- Total Tyres: ${load.total_tire ?? load.totalTyres ?? load.wheels}`);
  console.log(`- Pickup Location: ${extractAddress(load.pickupLocation) || load.origin || '(none)'}`);
  console.log(`- Drop Location: ${extractAddress(load.dropLocation) || load.destination || '(none)'}`);
  console.log('Comparison:');
  console.log(`- Vehicle Type: ${c.vehicleType.pass ? 'PASS' : 'FAIL'}${c.vehicleType.reason ? ` (${c.vehicleType.reason})` : ''}`);
  console.log(`- Vehicle Body Type: ${c.vehicleBodyType.pass ? 'PASS' : 'FAIL'}${c.vehicleBodyType.reason ? ` (${c.vehicleBodyType.reason})` : ''}`);
  console.log(`- Capacity: ${c.capacity.pass ? 'PASS' : 'FAIL'}${c.capacity.reason ? ` (${c.capacity.reason})` : ''}`);
  console.log(`- Container Feet: ${c.containerFeet.pass ? 'PASS' : 'FAIL'}${c.containerFeet.reason ? ` (${c.containerFeet.reason})` : ''}`);
  console.log(`- Total Tyres: ${c.totalTyres.pass ? 'PASS' : 'FAIL'}${c.totalTyres.reason ? ` (${c.totalTyres.reason})` : ''}`);
  console.log(`- Pickup Location: ${c.pickupLocation.pass ? 'PASS' : 'FAIL'}${c.pickupLocation.reason ? ` (${c.pickupLocation.reason})` : ''}`);
  console.log(`- Drop Location: ${c.dropLocation.pass ? 'PASS' : 'FAIL'}${c.dropLocation.reason ? ` (${c.dropLocation.reason})` : ''}`);
  console.log('Final Score:');
  console.log(`- Score: ${result.score}`);
  console.log(`- matchedOn: ${result.matchedOn.length ? result.matchedOn.join(', ') : '(none)'}`);
  console.log(`- ${accepted ? 'Accepted' : 'Rejected'}`);
  if (!accepted) {
    const failedCore = ['vehicleType', 'vehicleBodyType', 'capacity', 'containerFeet', 'totalTyres', 'pickupLocation', 'dropLocation']
      .filter(k => !c[k].pass)
      .map(k => `${k}: ${c[k].reason}`);
    console.log(`- Rejected because: score ${result.score} < minScore ${minScore}. Failing criteria -> ${failedCore.join(' | ') || 'none identified'}`);
  }
  console.log('----------------------------------------------------');
}

// Backward-compatible alias — old call sites use scoreMatch(truck, load, radiusKm)
function scoreMatch(truck, load, radiusKm = 50) {
  const { score, matchedOn } = compareTruckLoad(truck, load, radiusKm);
  return { score, matchedOn };
}

// ─── Price resolution (root-cause fix #2) ──────────────────────────────
//
// `bit` as seen on the separate "Find Load" / "Find Truck" listing
// endpoints is likely NOT a raw schema field — it's probably computed or
// joined in by that route (e.g. derived from the doc's own bitRecords, or
// populated from elsewhere). A plain `Load.find(...).lean()` /
// `Truck.find(...).lean()` in THIS router won't have that enrichment, so
// `doc.bit` can be empty here even when the listing endpoint shows a
// value for the same _id. This resolver checks every plausible raw field
// name, then falls back to the document's own `bitRecords` array (most
// recent record) if present, before giving up and returning null.
function resolvePrice(doc) {
  if (!doc) return null;

  const directCandidates = [
    doc.bit, doc.price, doc.biddingPrice, doc.bidPrice,
    doc.expectedPrice, doc.basePrice, doc.amount, doc.rate,
  ];
  for (const v of directCandidates) {
    if (v != null && v !== '') return v;
  }

  // Fall back to bitRecords — pick the most recently created record's bit,
  // since that's the closest analog to "current asking/bid amount".
  const records = Array.isArray(doc.bitRecords) ? doc.bitRecords
    : Array.isArray(doc.loadbitRecords) ? doc.loadbitRecords
    : null;
  if (records && records.length) {
    const sorted = [...records].sort((a, b) =>
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const latest = sorted[0];
    if (latest && latest.bit != null) return latest.bit;
  }

  return null;
}

// One-time-per-process diagnostic: print the raw keys of the first
// truck/load doc we see, so we can confirm exactly which field actually
// holds the price value on THIS collection (vs. what the listing endpoint
// shows after its own enrichment).
let _priceDebugLogged = { truck: false, load: false };
function logPriceFieldsOnce(kind, doc) {
  if (!doc || _priceDebugLogged[kind]) return;
  _priceDebugLogged[kind] = true;
  console.log(`\n--- Price field probe (${kind}, _id=${doc._id}) ---`);
  console.log('bit:', doc.bit, '| price:', doc.price, '| biddingPrice:', doc.biddingPrice,
    '| bidPrice:', doc.bidPrice, '| expectedPrice:', doc.expectedPrice,
    '| basePrice:', doc.basePrice, '| amount:', doc.amount, '| rate:', doc.rate);
  console.log('bitRecords present:', Array.isArray(doc.bitRecords), Array.isArray(doc.bitRecords) ? `(${doc.bitRecords.length})` : '');
  console.log('All raw keys:', Object.keys(doc).join(', '));
  console.log('--- End price field probe ---\n');
}

// ─── Serializers ──────────────────────────────────────────────────────

function serializeTruck(truck) {
  if (!truck) return null;
  logPriceFieldsOnce('truck', truck);
  return {
    _id: String(truck._id),
    id: truck.id || String(truck._id),
    truckNumber: truck.truckNumber || '',
    registrationNumber: truck.registrationNumber || '',
    truckType: truck.truckType || '',
    vehicleType: truck.vehicleType || null,
    vehicleBodyType: truck.vehicleBodyType || '',
    capacity: truck.capacity || '',
    totalTyres: truck.total_tire || truck.totalTyres || truck.wheels || null,
    containerFeet: truck.containerFeet || null,
    status: truck.status || '',
    currentLocation: truck.currentLocation || '',
    dropLocation: truck.dropLocation || '',
    routes: truck.routes || [],
    stop_all: truck.stop_all || [],
    price: resolvePrice(truck),
    bit: truck.bit ?? null,
    owner: truck.owner || null,
    ownerId: truck.ownerId || truck.userId || truck.createdBy || null,
    createdBy: truck.createdBy || null,
    createdAt: truck.createdAt || null,
    updatedAt: truck.updatedAt || null,
  };
}

function serializeLoad(load) {
  if (!load) return null;
  logPriceFieldsOnce('load', load);
  return {
    _id: String(load._id),
    id: load.id || String(load._id),
    loadNumber: load.loadNumber || '',
    title: load.title || '',
    pickupLocation: load.pickupLocation || {},
    dropLocation: load.dropLocation || {},
    origin: load.origin || extractAddress(load.pickupLocation),
    destination: load.destination || extractAddress(load.dropLocation),
    vehicleType: load.vehicleType || load.truckType || '',
    vehicleBodyType: load.vehicleBodyType || '',
    vehicleCapacity: load.vehicleCapacity || load.weight || load.loadCapacity || '',
    containerFeet: load.containerFeet || null,
    status: load.status || '',
    date: load.date || load.pickupTime || null,
    price: resolvePrice(load),
    bit: load.bit ?? null,
    weight: load.weight || null,
    loadCapacity: load.loadCapacity || null,
    owner: load.owner || null,
    ownerId: load.ownerId || load.userId || load.createdBy || null,
    createdBy: load.createdBy || null,
    createdAt: load.createdAt || null,
    updatedAt: load.updatedAt || null,
  };
}

async function attachOwners(items) {
  if (!items.length) return items;
  const ids = [...new Set(items.map(i => i.ownerId || i.userId || i.createdBy).filter(Boolean))];
  const users = await User.find({ _id: { $in: ids } }).select('_id id name mobile email').lean();
  const map = {};
  users.forEach(u => { map[String(u._id)] = u; });
  return items.map(i => {
    const oid = i.ownerId || i.userId || i.createdBy;
    return { ...i, _ownerDoc: oid ? (map[String(oid)] || null) : null };
  });
}

function formatOwner(u) {
  if (!u) return null;
  return { _id: String(u._id), id: u.id || null, name: u.name || null, mobile: u.mobile || null, email: u.email || null };
}

// ─── Main matching logic ──────────────────────────────────────────────

async function runMatching(resolvedUserId, params) {
  const {
    mode     = 'both',
    radiusKm = 50,
    minScore = 20,
    page     = 1,
    limit    = 20,
  } = params;

  console.log(`\n=== MATCHING DEBUG ===`);
  console.log(`Resolved User ID: ${resolvedUserId}`);
  console.log(`typeof resolvedUserId: ${typeof resolvedUserId} (${resolvedUserId?.constructor?.name})`);
  console.log(`Mode: ${mode}, Radius: ${radiusKm}km, MinScore: ${minScore}`);

  // ── Step 1: figure out whether ownerId/createdBy/userId are stored as
  // String or ObjectId in the Truck collection, and build an ID list that
  // matches BOTH representations. This is the actual root cause: querying
  // with only an ObjectId (or only a String) silently returns 0 docs when
  // the collection stores the other type.
  const userIdStr = String(resolvedUserId);
  const userIdObj = mongoose.isValidObjectId(resolvedUserId)
    ? new mongoose.Types.ObjectId(userIdStr)
    : null;

  const idVariants = userIdObj ? [userIdStr, userIdObj] : [userIdStr];

  const probeByOwnerIdString = await Truck.findOne({ ownerId: userIdStr }).lean();
  const probeByOwnerIdObject = userIdObj
    ? await Truck.findOne({ ownerId: userIdObj }).lean()
    : null;
  const countByOwnerIdString = await Truck.countDocuments({ ownerId: userIdStr });
  const countByOwnerIdObject = userIdObj
    ? await Truck.countDocuments({ ownerId: userIdObj })
    : 0;

  console.log('--- Type probe (Truck.ownerId) ---');
  console.log('Truck.findOne({ ownerId: resolvedUserId (raw) }):', probeByOwnerIdObject ? `FOUND (_id=${probeByOwnerIdObject._id})` : 'null');
  console.log('Truck.findOne({ ownerId: String(resolvedUserId) }):', probeByOwnerIdString ? `FOUND (_id=${probeByOwnerIdString._id})` : 'null');
  console.log(`Count via ObjectId match: ${countByOwnerIdObject}`);
  console.log(`Count via String match:   ${countByOwnerIdString}`);
  if (probeByOwnerIdString && !probeByOwnerIdObject) {
    console.log('=> Conclusion: ownerId is stored as a STRING in this collection.');
  } else if (!probeByOwnerIdString && probeByOwnerIdObject) {
    console.log('=> Conclusion: ownerId is stored as an ObjectId in this collection.');
  } else if (probeByOwnerIdString && probeByOwnerIdObject) {
    console.log('=> Conclusion: collection has MIXED types for ownerId (data inconsistency).');
  } else {
    console.log('=> Conclusion: no truck owned by this user under either type — check the data itself.');
  }
  console.log('--- End type probe ---\n');

  // Build $in filters across every variant of the id so the query works
  // regardless of how the field happens to be stored on a given document.
  const myFilter = {
    $or: [
      { ownerId:   { $in: idVariants } },
      { userId:    { $in: idVariants } },
      { createdBy: { $in: idVariants } },
    ],
  };

  const othersFilter = {
    $nor: [
      { ownerId:   { $in: idVariants } },
      { userId:    { $in: idVariants } },
      { createdBy: { $in: idVariants } },
    ],
  };

  // Mode now describes what the caller wants BACK, matching the intended flow:
  //   Login User (Transporter) → Fetch My Trucks → for each truck, find
  //   matching Loads (pickup/drop, vehicle type, body type, capacity,
  //   container feet, total tyres) → Return Matched Loads.
  //
  //   mode=load  → caller wants matched LOADS  → needs MY TRUCKS + OTHER LOADS
  //   mode=truck → caller wants matched TRUCKS → needs MY LOADS  + OTHER TRUCKS
  //   mode=both  → both directions
  const needsLoads  = ['load',  'both'].includes(mode); // "give me loads" -> drives truckMatches
  const needsTrucks = ['truck', 'both'].includes(mode); // "give me trucks" -> drives loadMatches

  // ── Step 2: matching must not start until the relevant "my X" has been
  // successfully fetched. For mode=load that's myTrucks (per the diagram);
  // for mode=truck that's myLoads.
  const [myLoads, myTrucks] = await Promise.all([
    needsTrucks ? Load.find({ ...myFilter, status: { $in: ['pending', 'assigned'] } }).lean() : Promise.resolve([]),
    needsLoads  ? Truck.find(myFilter).lean()                                                  : Promise.resolve([]),
  ]);

  console.log(`My Loads: ${myLoads.length}`);
  console.log(`My Trucks: ${myTrucks.length}`);

  if (needsLoads && myTrucks.length === 0) {
    console.log('⚠️  No trucks resolved for this user — cannot find matching loads for mode="load".');
  }
  if (needsTrucks && myLoads.length === 0) {
    console.log('⚠️  No loads resolved for this user — cannot find matching trucks for mode="truck".');
  }

  // Only fetched AFTER the corresponding "my X" lookup above has completed.
  const [otherTrucksRaw, otherLoadsRaw] = await Promise.all([
    needsTrucks ? Truck.find({ ...othersFilter, status: { $in: ['available', 'in-transit'] } }).lean() : Promise.resolve([]),
    needsLoads  ? Load.find({  ...othersFilter, status: { $in: ['pending',   'assigned']   } }).lean() : Promise.resolve([]),
  ]);

  console.log(`Other Trucks: ${otherTrucksRaw.length}`);
  console.log(`Other Loads: ${otherLoadsRaw.length}\n`);

  const [otherTrucks, otherLoads] = await Promise.all([
    attachOwners(otherTrucksRaw),
    attachOwners(otherLoadsRaw),
  ]);

  // mode=load: myTrucks vs otherLoads → "matched loads" per truck
  const truckMatches = [];
  if (needsLoads) {
    for (const myTruck of myTrucks) {
      const pairs = [];
      for (const load of otherLoads) {
        const result = compareTruckLoad(myTruck, load, Number(radiusKm));
        logMatchDebug(myTruck, load, result, minScore);
        if (result.score < minScore) continue;
        pairs.push({
          score: result.score,
          matchedOn: result.matchedOn,
          load: serializeLoad(load),
          loadOwner: formatOwner(load._ownerDoc),
        });
      }
      pairs.sort((a, b) => b.score - a.score);
      if (pairs.length > 0) {
        truckMatches.push({
          truck: serializeTruck(myTruck),
          totalMatches: pairs.length,
          matches: pairs,
        });
      }
    }
  }

  // mode=truck: myLoads vs otherTrucks → "matched trucks" per load
  const loadMatches = [];
  if (needsTrucks) {
    for (const myLoad of myLoads) {
      const pairs = [];
      for (const truck of otherTrucks) {
        const result = compareTruckLoad(truck, myLoad, Number(radiusKm));
        if (result.score < minScore) continue;
        pairs.push({
          score: result.score,
          matchedOn: result.matchedOn,
          truck: serializeTruck(truck),
          truckOwner: formatOwner(truck._ownerDoc),
        });
      }
      pairs.sort((a, b) => b.score - a.score);
      if (pairs.length > 0) {
        loadMatches.push({
          load: serializeLoad(myLoad),
          totalMatches: pairs.length,
          matches: pairs,
        });
      }
    }
  }

  // Flat list of matched Load documents (deduped, score-sorted) for callers
  // that just want "the loads that match my truck(s)" per the diagram,
  // rather than the grouped-by-truck structure above.
  const matchedLoadsFlat = [];
  if (needsLoads) {
    const byId = new Map();
    for (const tm of truckMatches) {
      for (const pair of tm.matches) {
        if (!byId.has(pair.load._id)) {
          byId.set(pair.load._id, { ...pair.load, matchScore: pair.score, matchedOn: pair.matchedOn });
        }
      }
    }
    matchedLoadsFlat.push(...[...byId.values()].sort((a, b) => b.matchScore - a.matchScore));
  }

  const skip  = (page - 1) * limit;
  const total = needsLoads ? matchedLoadsFlat.length : loadMatches.length;

  return {
    mode: mode === 'load' ? 'load_results' : mode === 'truck' ? 'truck_results' : 'both',
    myLoads:  myLoads.map(l => ({ _id: String(l._id), id: l.id || String(l._id), loadNumber: l.loadNumber || '', title: l.title, origin: l.origin, destination: l.destination, status: l.status, price: resolvePrice(l) })),
    myTrucks: myTrucks.map(t => ({ _id: String(t._id), id: t.id || String(t._id), truckNumber: t.truckNumber || '', registrationNumber: t.registrationNumber, truckType: t.truckType, status: t.status, price: resolvePrice(t) })),
    // Flat, score-sorted list — this is what mode=load should render: the
    // loads that matched this user's truck(s), per Pickup/Drop, Vehicle
    // Type, Vehicle Body Type, Capacity, Container Feet, Total Tyres.
    loads: matchedLoadsFlat.slice(skip, skip + limit),
    loadMatches:  loadMatches.slice(skip,  skip + limit),
    truckMatches: truckMatches.slice(skip, skip + limit),
    summary: {
      totalMyLoads:       myLoads.length,
      totalMyTrucks:      myTrucks.length,
      totalLoadMatches:   loadMatches.length,
      totalTruckMatches:  truckMatches.length,
      totalMatchedLoads:  matchedLoadsFlat.length,
    },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

// ─── Route handlers ───────────────────────────────────────────────────

matchRouter.get('/', async (req, res) => {
  try {
    const rawUserId = req.user?._id || req.user?.id || req.user?.userId;
    
    console.log('=== GET /api/match ===');
    console.log('Raw UserId:', rawUserId);

    const resolvedUserId = await resolveToObjectId(User, String(rawUserId));
    
    console.log('Resolved UserId:', resolvedUserId);

    if (!resolvedUserId) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found in database',
        debug: {
          rawUserId,
          resolvedUserId: null,
        }
      });
    }

    const { mode = 'both', radiusKm = 50, minScore = 20, page = 1, limit = 20 } = req.query;
    const result = await runMatching(resolvedUserId, {
      mode,
      radiusKm: Number(radiusKm),
      minScore:  Number(minScore),
      page:      Math.max(1, parseInt(page,  10) || 1),
      limit:     Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
    });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error('Match API error:', err);
    res.status(500).json({ success: false, message: err.message, debug: { error: err.toString() } });
  }
});

matchRouter.post('/', async (req, res) => {
  try {
    const rawUserId = req.user?._id || req.user?.id || req.user?.userId;
    
    console.log('=== POST /api/match ===');
    console.log('Raw UserId:', rawUserId);

    const resolvedUserId = await resolveToObjectId(User, String(rawUserId));
    
    console.log('Resolved UserId:', resolvedUserId);

    if (!resolvedUserId) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found in database',
        debug: {
          rawUserId,
          resolvedUserId: null,
        }
      });
    }

    const { mode = 'both', radiusKm = 50, minScore = 20, page = 1, limit = 20 } = req.body || {};
    const result = await runMatching(resolvedUserId, {
      mode,
      radiusKm: Number(radiusKm),
      minScore:  Number(minScore),
      page:      Math.max(1, parseInt(page,  10) || 1),
      limit:     Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
    });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error('Match API error:', err);
    res.status(500).json({ success: false, message: err.message, debug: { error: err.toString() } });
  }
});

module.exports = matchRouter;