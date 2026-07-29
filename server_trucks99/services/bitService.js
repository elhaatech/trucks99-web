'use strict';

const mongoose = require('mongoose');
const Load = require('../schema/load');
const Truck = require('../schema/truck');
const BuySellProduct = require('../schema/buysellProduct');
const LoadBitRecord = require('../schema/loadBitRecord');
const TruckBitRecord = require('../schema/truckBitRecord');
const ProductBitRecord = require('../schema/productBitRecord');
const User = require('../schema/user');
const {
  resolveToObjectId,
  isObjectId,
  toResponse,
} = require('../helpers/uuidHelper');
const sendNotification = require('../Firebase/firebase');
const { createBuySellTransactions } = require('./buySellTransactionService');
const {
  notify,
  NOTIFICATION_EVENTS,
} = require('./notificationService');
const { productLabel } = require('../helpers/productLabel');

class BitServiceError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'BitServiceError';
    this.statusCode = statusCode;
  }
}

const ENTITY_TYPES = ['load', 'truck', 'product'];
const VALID_STATUS = ['pending', 'accept', 'reject'];

function entityPublicId(obj) {
  if (!obj) return null;
  if (typeof obj === 'string') return obj;
  return obj.id || obj.uuid || (obj._id != null ? String(obj._id) : null);
}

function normalizeStatus(raw) {
  const s = String(raw || 'pending').trim().toLowerCase();
  if (s === 'approved' || s === 'accepted' || s === 'accept') return 'accept';
  if (s === 'rejected' || s === 'reject') return 'reject';
  if (s === 'pending') return 'pending';
  return VALID_STATUS.includes(s) ? s : 'pending';
}

function normalizeType(raw) {
  const t = String(raw || '').trim().toLowerCase();
  return ENTITY_TYPES.includes(t) ? t : '';
}

function normalizeOfferType(raw) {
  const s = String(raw || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!s) return '';
  if (s === 'my_offers' || s === 'my_offer' || s === 'myoffers') return 'my_offers';
  if (
    s === 'received_offers' ||
    s === 'received_offer' ||
    s === 'receive_offers' ||
    s === 'receive_offer' ||
    s === 'recive_offers' ||
    s === 'recive_offer' ||
    s === 'receivedoffers'
  ) {
    return 'received_offers';
  }
  return '';
}

function pickEntityId(body) {
  const b = body || {};
  return (
    b.entityId ||
    b.loadId ||
    b.truckId ||
    b.productId ||
    null
  );
}

function guestKeyFromBody(body) {
  const key = body?.guestKey;
  return key != null && String(key).trim() !== '' ? String(key).trim() : '';
}

function guestMarkerEmail(guestKey) {
  return `guest:${guestKey}`;
}

function isAdminUser(user) {
  if (!user) return false;
  const email = user.email && String(user.email).toLowerCase();
  if (email === 'admin@mail.com') return true;
  const role = user.roleId || user.role;
  const roleName =
    typeof role === 'string'
      ? role
      : role?.name || role?.status || '';
  const n = String(roleName).toLowerCase();
  return n === 'admin' || n === 'super admin' || n === 'super_admin' || n === 'superadmin';
}

async function resolveUserObjectId(userRef) {
  if (!userRef) return null;
  if (userRef instanceof mongoose.Types.ObjectId) return userRef;
  if (typeof userRef === 'object' && userRef._id) {
    return userRef._id instanceof mongoose.Types.ObjectId
      ? userRef._id
      : await resolveUserObjectId(userRef._id);
  }
  return resolveToObjectId(User, String(userRef).trim());
}

async function resolveEntityType(entityIdRaw, typeHint) {
  const hint = normalizeType(typeHint);
  const id = String(entityIdRaw || '').trim();
  if (!id) return null;

  const tryLoad = async () => {
    const oid = await resolveToObjectId(Load, id);
    if (!oid) return null;
    const doc = await Load.findById(oid).lean();
    return doc ? { type: 'load', objectId: oid, doc } : null;
  };
  const tryTruck = async () => {
    const oid = await resolveToObjectId(Truck, id);
    if (!oid) return null;
    const doc = await Truck.findById(oid).lean();
    return doc ? { type: 'truck', objectId: oid, doc } : null;
  };
  const tryProduct = async () => {
    const oid = await resolveToObjectId(BuySellProduct, id);
    if (!oid) return null;
    const doc = await BuySellProduct.findById(oid).lean();
    return doc ? { type: 'product', objectId: oid, doc } : null;
  };

  if (hint === 'load') return tryLoad();
  if (hint === 'truck') return tryTruck();
  if (hint === 'product') return tryProduct();

  return (await tryLoad()) || (await tryTruck()) || (await tryProduct());
}

function getEntityOwnerObjectIds(entityType, entityDoc) {
  if (!entityDoc) return [];
  const ids = new Set();
  const add = (v) => {
    if (v) ids.add(v.toString());
  };

  if (entityType === 'load') {
    add(entityDoc.ownerId);
    add(entityDoc.userId);
    add(entityDoc.createdBy);
  } else if (entityType === 'truck') {
    add(entityDoc.ownerId);
    add(entityDoc.createdBy);
  } else if (entityType === 'product') {
    add(entityDoc.userid);
  }
  return [...ids];
}

function userOwnsEntity(entityType, entityDoc, userOid) {
  if (!entityDoc || !userOid) return false;
  const uid = userOid.toString();
  return getEntityOwnerObjectIds(entityType, entityDoc).includes(uid);
}

async function findBitRecordById(id) {
  if (!id) return null;
  const raw = String(id).trim();

  let doc = await LoadBitRecord.findOne({ id: raw });
  if (doc) return { doc, kind: 'load' };

  doc = await TruckBitRecord.findOne({ id: raw });
  if (doc) return { doc, kind: 'truck' };

  doc = await ProductBitRecord.findOne({ id: raw });
  if (doc) return { doc, kind: 'product' };

  if (isObjectId(raw)) {
    const oid = new mongoose.Types.ObjectId(raw);
    doc = await LoadBitRecord.findById(oid);
    if (doc) return { doc, kind: 'load' };
    doc = await TruckBitRecord.findById(oid);
    if (doc) return { doc, kind: 'truck' };
    doc = await ProductBitRecord.findById(oid);
    if (doc) return { doc, kind: 'product' };
  }

  return null;
}

async function loadEntityMaps(records) {
  const loadIds = new Set();
  const truckIds = new Set();
  const productIds = new Set();

  for (const row of records) {
    if (row._sourceKind === 'load' || row.loadId) {
      if (row.loadId) loadIds.add(String(row.loadId));
    }
    if (row._sourceKind === 'truck' || row.truckId) {
      if (row.truckId) truckIds.add(String(row.truckId));
    }
    if (row._sourceKind === 'product' || row.productId) {
      if (row.productId) productIds.add(String(row.productId));
    }
  }

  const toOid = (s) => new mongoose.Types.ObjectId(s);
  const [loads, trucks, products] = await Promise.all([
    loadIds.size
      ? Load.find({ _id: { $in: [...loadIds].map(toOid) } }).lean()
      : [],
    truckIds.size
      ? Truck.find({ _id: { $in: [...truckIds].map(toOid) } }).lean()
      : [],
    productIds.size
      ? BuySellProduct.find({ _id: { $in: [...productIds].map(toOid) } }).lean()
      : [],
  ]);

  return {
    loads: Object.fromEntries(loads.map((d) => [String(d._id), d])),
    trucks: Object.fromEntries(trucks.map((d) => [String(d._id), d])),
    products: Object.fromEntries(products.map((d) => [String(d._id), d])),
  };
}

async function mapBitRecordRow(record, sourceKind, entityMaps) {
  const lean = record.toObject ? record.toObject() : { ...record };
  const kind = sourceKind || lean._sourceKind || 'load';
  const maps = entityMaps || (await loadEntityMaps([{ ...lean, _sourceKind: kind }]));

  const loadDoc = lean.loadId ? maps.loads[String(lean.loadId)] : null;
  const truckDoc = lean.truckId ? maps.trucks[String(lean.truckId)] : null;
  const productDoc = lean.productId ? maps.products[String(lean.productId)] : null;

  const loadUuid = entityPublicId(loadDoc) || null;
  const truckUuid = entityPublicId(truckDoc) || null;
  const productUuid = entityPublicId(productDoc) || null;

  return {
    ...toResponse(lean),
    type: kind,
    loadId: loadUuid,
    truckId: truckUuid,
    productId: productUuid,
    load_id: loadUuid,
    truck_id: truckUuid,
    product_id: productUuid,
    userId: lean.userId ? String(lean.userId) : null,
    load_info: loadDoc ? toResponse(loadDoc) : null,
    truck_info: truckDoc ? toResponse(truckDoc) : null,
    product_info: productDoc ? toResponse(productDoc) : null,
    product_owner: productDoc?.userid ? String(productDoc.userid) : null,
    product_status: productDoc?.status || null,
  };
}

async function mapBitRecordList(records) {
  if (!records.length) return [];
  const entityMaps = await loadEntityMaps(records);
  return Promise.all(
    records.map((r) => mapBitRecordRow(r, r._sourceKind, entityMaps)),
  );
}

function dedupeRecords(records) {
  const seen = new Set();
  const out = [];
  for (const r of records) {
    const key = r.id || String(r._id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function tagRecords(records, kind) {
  return records.map((r) => ({ ...r, _sourceKind: kind }));
}

async function queryLoadEntityBids(entityOid, userFilter, offerType) {
  const base = {};
  if (offerType === 'my_offers' && userFilter) {
    base.userId = userFilter;
  } else if (offerType === 'received_offers' && userFilter) {
    base.userId = { $ne: userFilter };
  }

  const [fromLoad, fromTruck] = await Promise.all([
    LoadBitRecord.find({ ...base, loadId: entityOid }).sort({ createdAt: 1 }).lean(),
    TruckBitRecord.find({ ...base, loadId: entityOid }).sort({ createdAt: 1 }).lean(),
  ]);

  return dedupeRecords([
    ...tagRecords(fromLoad, 'load'),
    ...tagRecords(fromTruck, 'truck'),
  ]);
}

async function queryTruckEntityBids(entityOid, userFilter, offerType) {
  const base = {};
  if (offerType === 'my_offers' && userFilter) {
    base.userId = userFilter;
  } else if (offerType === 'received_offers' && userFilter) {
    base.userId = { $ne: userFilter };
  }

  const [fromTruck, fromLoad] = await Promise.all([
    TruckBitRecord.find({ ...base, truckId: entityOid }).sort({ createdAt: 1 }).lean(),
    LoadBitRecord.find({ ...base, truckId: entityOid }).sort({ createdAt: 1 }).lean(),
  ]);

  return dedupeRecords([
    ...tagRecords(fromTruck, 'truck'),
    ...tagRecords(fromLoad, 'load'),
  ]);
}

async function queryProductEntityBids(entityOid, userFilter, offerType, guestKey) {
  const base = { productId: entityOid };
  if (offerType === 'my_offers') {
    if (userFilter) {
      base.userId = userFilter;
    } else if (guestKey) {
      base.userEmail = guestMarkerEmail(guestKey);
    }
  } else if (offerType === 'received_offers' && userFilter) {
    base.userId = { $ne: userFilter };
  }

  const rows = await ProductBitRecord.find(base).sort({ createdAt: 1 }).lean();
  return tagRecords(rows, 'product');
}

async function getOwnedEntityIds(userOid, typeFilter) {
  const filter = normalizeType(typeFilter);
  const result = { loadIds: [], truckIds: [], productIds: [] };

  if (!filter || filter === 'load') {
    const loads = await Load.find({
      $or: [{ ownerId: userOid }, { userId: userOid }, { createdBy: userOid }],
    })
      .select('_id')
      .lean();
    result.loadIds = loads.map((l) => l._id);
  }

  if (!filter || filter === 'truck') {
    const trucks = await Truck.find({
      $or: [{ ownerId: userOid }, { createdBy: userOid }],
    })
      .select('_id')
      .lean();
    result.truckIds = trucks.map((t) => t._id);
  }

  if (!filter || filter === 'product') {
    const products = await BuySellProduct.find({ userid: userOid })
      .select('_id')
      .lean();
    result.productIds = products.map((p) => p._id);
  }

  return result;
}

async function queryMyOffersGlobal(userOid, typeFilter, guestKey) {
  const filter = normalizeType(typeFilter);
  const queries = [];

  if (!filter || filter === 'load') {
    queries.push(
      LoadBitRecord.find({ userId: userOid }).sort({ createdAt: -1 }).lean()
        .then((rows) => tagRecords(rows, 'load')),
    );
  }
  if (!filter || filter === 'truck') {
    queries.push(
      TruckBitRecord.find({ userId: userOid }).sort({ createdAt: -1 }).lean()
        .then((rows) => tagRecords(rows, 'truck')),
    );
  }
  if (!filter || filter === 'product') {
    if (userOid) {
      queries.push(
        ProductBitRecord.find({ userId: userOid }).sort({ createdAt: -1 }).lean()
          .then((rows) => tagRecords(rows, 'product')),
      );
    } else if (guestKey) {
      queries.push(
        ProductBitRecord.find({ userEmail: guestMarkerEmail(guestKey) })
          .sort({ createdAt: -1 })
          .lean()
          .then((rows) => tagRecords(rows, 'product')),
      );
    }
  }

  const chunks = await Promise.all(queries);
  return dedupeRecords(chunks.flat());
}

async function queryReceivedOffersGlobal(userOid, typeFilter) {
  const owned = await getOwnedEntityIds(userOid, typeFilter);
  const filter = normalizeType(typeFilter);
  const notMe = { $ne: userOid };
  const queries = [];

  if ((!filter || filter === 'load') && owned.loadIds.length) {
    queries.push(
      LoadBitRecord.find({ loadId: { $in: owned.loadIds }, userId: notMe })
        .sort({ createdAt: -1 })
        .lean()
        .then((rows) => tagRecords(rows, 'load')),
      TruckBitRecord.find({ loadId: { $in: owned.loadIds }, userId: notMe })
        .sort({ createdAt: -1 })
        .lean()
        .then((rows) => tagRecords(rows, 'truck')),
    );
  }

  if ((!filter || filter === 'truck') && owned.truckIds.length) {
    queries.push(
      TruckBitRecord.find({ truckId: { $in: owned.truckIds }, userId: notMe })
        .sort({ createdAt: -1 })
        .lean()
        .then((rows) => tagRecords(rows, 'truck')),
      LoadBitRecord.find({ truckId: { $in: owned.truckIds }, userId: notMe })
        .sort({ createdAt: -1 })
        .lean()
        .then((rows) => tagRecords(rows, 'load')),
    );
  }

  if ((!filter || filter === 'product') && owned.productIds.length) {
    queries.push(
      ProductBitRecord.find({ productId: { $in: owned.productIds }, userId: notMe })
        .sort({ createdAt: -1 })
        .lean()
        .then((rows) => tagRecords(rows, 'product')),
    );
  }

  if (!queries.length) return [];
  const chunks = await Promise.all(queries);
  return dedupeRecords(chunks.flat());
}

async function resolveBidderFields(body, reqUser, options = {}) {
  const { allowGuest = false } = options;
  const actor = body.user || body.requestingUser || reqUser || {};
  const userIdRaw =
    body.userId ||
    actor._id ||
    actor.id ||
    reqUser?._id ||
    reqUser?.id;

  let userOid = userIdRaw ? await resolveUserObjectId(userIdRaw) : null;

  const userName =
    body.userName ||
    actor.name ||
    reqUser?.name ||
    '';
  const userEmail =
    body.userEmail ||
    actor.email ||
    actor.mobile ||
    reqUser?.email ||
    reqUser?.mobile ||
    '';

  if (!userOid && allowGuest) {
    const guestKey = guestKeyFromBody(body);
    if (guestKey) {
      return {
        userOid: null,
        userName: userName || 'Guest',
        userEmail: guestMarkerEmail(guestKey),
      };
    }
  }

  if (!userOid) {
    throw new BitServiceError('Bidder user not found', 404);
  }

  return { userOid, userName, userEmail };
}

async function rejectSiblingBids(kind, record) {
  if (!record || !kind) return;

  /**
   * CRITICAL LOGIC:
   * 
   * The competition grouping depends on which entity is being competed FOR:
   * 
   * 1. LoadBitRecord with loadId → Multiple entities (Loads, Trucks, Products) bidding FOR one Load
   *    Reject ALL LoadBitRecords, TruckBitRecords, ProductBitRecords with same loadId
   * 
   * 2. TruckBitRecord with loadId → Truck bidding FOR a Load (competing with other trucks)
   *    Reject ALL TruckBitRecords and LoadBitRecords with same loadId (NOT by truckId)
   * 
   * 3. TruckBitRecord without loadId (truckId only) → Multiple Loads bidding FOR one Truck
   *    Reject ALL TruckBitRecords and LoadBitRecords with same truckId
   * 
   * 4. ProductBitRecord with productId → Multiple buyers bidding FOR one Product
   *    Reject ALL ProductBitRecords with same productId
   */

  if (kind === 'load' && record.loadId) {
    // Load offer accepted: reject all competing offers for this Load
    // Competition could be from other LoadBitRecords, TruckBitRecords, or ProductBitRecords
    await Promise.all([
      LoadBitRecord.updateMany(
        { loadId: record.loadId, _id: { $ne: record._id } },
        { $set: { status: 'reject' } },
      ),
      TruckBitRecord.updateMany(
        { loadId: record.loadId, _id: { $ne: record._id } },
        { $set: { status: 'reject' } },
      ),
      ProductBitRecord.updateMany(
        { loadId: record.loadId, _id: { $ne: record._id } },
        { $set: { status: 'reject' } },
      ),
    ]);
    await Load.findByIdAndUpdate(record.loadId, {
      $set: { status: 'accepted', bit: record.bit, bitReason: record.bitReason || '' },
    });
    const loadDoc = await Load.findById(record.loadId).lean();
    if (loadDoc && sendNotification.publishLoadBidEvent) {
      await sendNotification.publishLoadBidEvent({
        loadId: entityPublicId(loadDoc),
        eventType: 'accepted',
        bitRecordId: record.id || String(record._id),
        bidAmount: record.bit,
        bidderUserId: record.userId ? String(record.userId) : null,
        bidderName: record.userName || null,
        status: 'accept',
      });
    }
    return;
  }

  if (kind === 'truck') {
    // Truck bid accepted: competition context depends on whether it's bidding FOR a Load or RECEIVING from Loads
    
    if (record.loadId) {
      // CASE: Truck is bidding FOR a Load (competing with other trucks for the same load)
      // Reject all TruckBitRecords and LoadBitRecords competing for this load
      // KEY FIX: Group by loadId, NOT truckId
      await Promise.all([
        TruckBitRecord.updateMany(
          { loadId: record.loadId, _id: { $ne: record._id } },
          { $set: { status: 'reject' } },
        ),
        LoadBitRecord.updateMany(
          { loadId: record.loadId, _id: { $ne: record._id } },
          { $set: { status: 'reject' } },
        ),
      ]);
    } else if (record.truckId) {
      // CASE: Truck is RECEIVING bids from multiple loads (multiple loads bidding FOR this truck)
      // Reject all TruckBitRecords and LoadBitRecords competing for this truck
      await Promise.all([
        TruckBitRecord.updateMany(
          { truckId: record.truckId, _id: { $ne: record._id } },
          { $set: { status: 'reject' } },
        ),
        LoadBitRecord.updateMany(
          { truckId: record.truckId, _id: { $ne: record._id } },
          { $set: { status: 'reject' } },
        ),
      ]);
    }

    // Update the truck entity with the accepted bid details
    if (record.truckId) {
      await Truck.findByIdAndUpdate(record.truckId, {
        $set: { bit: record.bit, bitReason: record.bitReason || '' },
      });
    }
    return;
  }

  if (kind === 'product' && record.productId) {
    // Product offer accepted: reject all competing offers for this Product
    await ProductBitRecord.updateMany(
      { productId: record.productId, _id: { $ne: record._id } },
      { $set: { status: 'reject' } },
    );
  }
}

async function createBid(body, reqUser) {
  const kind = normalizeType(body.type) || 'load';
  const bit = Number(body.bit);
  if (!Number.isFinite(bit) || bit <= 0) {
    throw new BitServiceError('Valid bid amount (bit) is required', 400);
  }

  const status = normalizeStatus(body.status);
  const { userOid, userName, userEmail } = await resolveBidderFields(body, reqUser, {
    allowGuest: kind === 'product',
  });
  const bitReason = body.bitReason != null ? String(body.bitReason).trim() : '';

  let saved;
  let type = kind;

  if (kind === 'load') {
    const loadIdRaw = body.loadId || body.entityId;
    const loadOid = await resolveToObjectId(Load, loadIdRaw);
    if (!loadOid) throw new BitServiceError('Load not found', 404);

    let truckOid = null;
    const truckIdRaw = body.truckId;
    if (truckIdRaw != null && String(truckIdRaw).trim() !== '') {
      truckOid = await resolveToObjectId(Truck, truckIdRaw);
      if (!truckOid) throw new BitServiceError('Truck not found', 404);
    }

    saved = await LoadBitRecord.create({
      loadId: loadOid,
      truckId: truckOid || undefined,
      bit,
      bitReason: bitReason || undefined,
      status,
      userId: userOid,
      userName: userName || undefined,
      userEmail: userEmail || undefined,
    });
    type = 'load';
  } else if (kind === 'truck') {
    const truckIdRaw = body.truckId || body.entityId;
    const truckOid = await resolveToObjectId(Truck, truckIdRaw);
    if (!truckOid) throw new BitServiceError('Truck not found', 404);

    let loadOid = null;
    const loadIdRaw = body.loadId;
    if (loadIdRaw != null && String(loadIdRaw).trim() !== '') {
      loadOid = await resolveToObjectId(Load, loadIdRaw);
      if (!loadOid) throw new BitServiceError('Load not found', 404);
    }

    saved = await TruckBitRecord.create({
      truckId: truckOid,
      loadId: loadOid || undefined,
      bit,
      bitReason: bitReason || undefined,
      status,
      userId: userOid,
      userName: userName || undefined,
      userEmail: userEmail || undefined,
    });
    type = 'truck';
  } else if (kind === 'product') {
    const productIdRaw = body.productId || body.entityId;
    const productOid = await resolveToObjectId(BuySellProduct, productIdRaw);
    if (!productOid) throw new BitServiceError('Product not found', 404);

    const productDoc = await BuySellProduct.findById(productOid).select('status userid').lean();
    if (!productDoc) throw new BitServiceError('Product not found', 404);

    if (productDoc.status === 'sold') {
      throw new BitServiceError('Product is already sold.', 400);
    }
    if (productDoc.status === 'purchased') {
      throw new BitServiceError('Product has already been purchased.', 400);
    }
    if (productDoc.status === 'booking') {
      throw new BitServiceError('Product is currently booked.', 400);
    }
    if (!["active", "pending"].includes(productDoc.status)) {
      throw new BitServiceError('Product is not available for purchase.', 400);
    }

    const duplicateFilter = { productId: productOid };
    if (userOid) {
      duplicateFilter.userId = userOid;
    } else if (userEmail) {
      duplicateFilter.userEmail = userEmail;
    }
    const existingOffer = await ProductBitRecord.findOne(duplicateFilter).lean();
    if (existingOffer) {
      throw new BitServiceError(
        'You have already submitted an offer for this product.',
        400,
      );
    }

    saved = await ProductBitRecord.create({
      productId: productOid,
      bit,
      bitReason: bitReason || undefined,
      status,
      userId: userOid || undefined,
      userName: userName || undefined,
      userEmail: userEmail || undefined,
    });
    type = 'product';
  } else {
    throw new BitServiceError('Invalid bid type. Use load, truck, or product.', 400);
  }

  const bitRecord = await mapBitRecordRow(saved, type);

  if (type === 'product' && saved.productId) {
    const productDoc = await BuySellProduct.findById(saved.productId).lean();
    const ownerIds = getEntityOwnerObjectIds('product', productDoc);
    const pName = productLabel(productDoc);
    for (const ownerId of ownerIds) {
      if (ownerId === String(userOid)) continue;
      notify({
        userId: ownerId,
        event: NOTIFICATION_EVENTS.BID_PLACED,
        data: {
          userName: userName || 'Buyer',
          productName: pName,
          amount: bit,
        },
        metadata: { productId: saved.productId, bitRecordId: saved._id },
      }).catch((err) =>
        console.error('[bitService] bid notification failed:', err.message),
      );
    }
  }

  return {
    statusCode: 201,
    message: 'Bid created successfully',
    type,
    bitRecord,
  };
}

async function listBitRecords(body, reqUser) {
  const offerType = normalizeOfferType(body.offerType);
  const typeFilter = normalizeType(body.type);
  const entityIdRaw = pickEntityId(body);
  const guestKey = guestKeyFromBody(body);
  const userIdRaw = body.userId || reqUser?._id || reqUser?.id;
  const resolvedUserId = userIdRaw
    ? await resolveUserObjectId(userIdRaw)
    : null;

  // User-wide list requires offerType; entity-scoped list may omit it (returns all bids on entity).
  if (!offerType && !entityIdRaw) {
    throw new BitServiceError('offerType must be my_offers or received_offers', 400);
  }
  if (offerType && !['my_offers', 'received_offers'].includes(offerType)) {
    throw new BitServiceError('offerType must be my_offers or received_offers', 400);
  }

  let rows = [];

  if (entityIdRaw) {
    const resolved = await resolveEntityType(entityIdRaw, typeFilter);
    if (!resolved) {
      throw new BitServiceError('Entity not found', 404);
    }

    if (offerType === 'received_offers') {
      const admin = isAdminUser(reqUser);
      if (resolvedUserId) {
        const owns = userOwnsEntity(resolved.type, resolved.doc, resolvedUserId);
        if (!owns && !admin) {
          throw new BitServiceError('Only the entity owner can view received offers', 403);
        }
      } else if (!admin) {
        throw new BitServiceError('userId is required for received_offers', 400);
      }
    }

    const userFilter =
      offerType === 'my_offers'
        ? resolvedUserId || null
        : resolvedUserId || null;

    if (resolved.type === 'load') {
      rows = await queryLoadEntityBids(resolved.objectId, userFilter, offerType);
    } else if (resolved.type === 'truck') {
      rows = await queryTruckEntityBids(resolved.objectId, userFilter, offerType);
    } else {
      rows = await queryProductEntityBids(
        resolved.objectId,
        userFilter,
        offerType,
        resolved.type === 'product' && offerType === 'my_offers' && !userFilter
          ? guestKey
          : '',
      );
    }

    if (offerType === 'received_offers' && !resolvedUserId && isAdminUser(reqUser)) {
      const ownerIds = new Set(getEntityOwnerObjectIds(resolved.type, resolved.doc));
      rows = rows.filter((r) => !r.userId || !ownerIds.has(String(r.userId)));
    }
  } else {
    const isProductGuestMyOffers =
      offerType === 'my_offers' &&
      typeFilter === 'product' &&
      !resolvedUserId &&
      guestKey;

    if (!resolvedUserId && !isProductGuestMyOffers) {
      throw new BitServiceError('userId is required when entityId is omitted', 400);
    }

    if (offerType === 'my_offers') {
      rows = await queryMyOffersGlobal(resolvedUserId, typeFilter, guestKey);
    } else {
      rows = await queryReceivedOffersGlobal(resolvedUserId, typeFilter);
    }
  }

  const bitRecords = await mapBitRecordList(rows);
  return { bitRecords };
}

async function updateBid(id, body, reqUser) {
  const found = await findBitRecordById(id);
  if (!found) throw new BitServiceError('Bit record not found', 404);

  const { doc, kind } = found;
  const updates = {};

  if (body.bit != null) {
    const bit = Number(body.bit);
    if (!Number.isFinite(bit) || bit <= 0) {
      throw new BitServiceError('Valid bid amount (bit) is required', 400);
    }
    updates.bit = bit;
  }

  if (body.bitReason != null) {
    updates.bitReason = String(body.bitReason).trim();
  }

  if (body.status != null) {
    updates.status = normalizeStatus(body.status);
  }

  if (!Object.keys(updates).length) {
    throw new BitServiceError('Provide at least one of bit, bitReason, or status', 400);
  }

  if (body.type && normalizeType(body.type) && normalizeType(body.type) !== kind) {
    throw new BitServiceError('Bid type does not match stored record', 400);
  }

  if (updates.status === 'accept' && kind === 'product' && doc.productId) {
    const product = await BuySellProduct.findById(doc.productId)
      .select('status')
      .lean();
    if (!product) {
      throw new BitServiceError('Product not found', 404);
    }
    if (['sold', 'purchased', 'booking'].includes(product.status)) {
      throw new BitServiceError(
        product.status === 'sold'
          ? 'Product is already sold.'
          : product.status === 'purchased'
            ? 'Product has already been purchased.'
            : 'Product is currently booked.',
        400,
      );
    }
    if (!["active", "pending"].includes(product.status)) {
      throw new BitServiceError('Product is not available for purchase.', 400);
    }
  }

  Object.assign(doc, updates);
  await doc.save();

  if (updates.status === 'accept') {
    const recordObj = doc.toObject ? doc.toObject() : doc;
    await rejectSiblingBids(kind, recordObj);

    if (kind === 'product' && recordObj.productId) {
      try {
        const [product, freshBit] = await Promise.all([
          BuySellProduct.findById(recordObj.productId).lean(),
          ProductBitRecord.findById(recordObj._id).lean(),
        ]);
        if (product && freshBit) {
          const txResult = await createBuySellTransactions(product, freshBit);
          console.log(
            `[bitService] createBuySellTransactions result for bit ${freshBit._id}:`,
            JSON.stringify(txResult),
          );
        } else {
          console.error(
            `[bitService] createBuySellTransactions skipped: product=${!!product} bit=${!!freshBit} (productId=${recordObj.productId})`,
          );
        }
      } catch (txErr) {
        console.error(
          `[bitService] createBuySellTransactions failed for product bit ${recordObj._id}:`,
          txErr.message,
        );
      }
    }
  }

  const bitRecord = await mapBitRecordRow(doc, kind);

  if (updates.status === 'accept' && kind === 'product' && doc.productId) {
    const productDoc = await BuySellProduct.findById(doc.productId).lean();
    if (productDoc && doc.userId) {
      notify({
        userId: doc.userId,
        event: NOTIFICATION_EVENTS.BID_ACCEPTED,
        data: {
          productName: productLabel(productDoc),
          amount: doc.bit,
        },
        metadata: { productId: doc.productId, bitRecordId: doc._id },
      }).catch((err) =>
        console.error('[bitService] bid accepted notification failed:', err.message),
      );
    }
  } else if (updates.status === 'reject' && doc.userId) {
    notify({
      userId: doc.userId,
      event: NOTIFICATION_EVENTS.BID_REJECTED,
      data: { amount: doc.bit },
      metadata: { bitRecordId: doc._id },
    }).catch((err) =>
      console.error('[bitService] bid rejected notification failed:', err.message),
    );
  }

  return {
    statusCode: 200,
    message: 'Bid updated successfully',
    type: kind,
    bitRecord,
  };
}

module.exports = {
  BitServiceError,
  createBid,
  listBitRecords,
  updateBid,
};