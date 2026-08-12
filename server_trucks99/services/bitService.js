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

function bitRecordPublicId(record) {
  if (!record) return '';
  return record.id || (record._id != null ? String(record._id) : '');
}

function loadLabel(loadDoc) {
  if (!loadDoc) return 'load';
  return loadDoc.loadNumber || loadDoc.title || 'load';
}

function truckLabel(truckDoc) {
  if (!truckDoc) return 'truck';
  return (
    truckDoc.truckNumber ||
    truckDoc.registrationNumber ||
    truckDoc.truckType ||
    'truck'
  );
}

function dispatchBidNotify({ userId, event, data, metadata, dedupeKey }) {
  if (!userId) {
    console.warn("[FCM][bitService] SKIP — no userId for event:", event);
    return;
  }

  console.log("[FCM][bitService] dispatch →", {
    event,
    userId: String(userId),
    dedupeKey,
    postType: metadata?.postType,
    productId: metadata?.productId,
    requestId: metadata?.requestId || metadata?.bitRecordId,
    status: metadata?.status,
    amount: data?.amount,
  });

  notify({ userId, event, data, metadata, dedupeKey })
    .then((result) => {
      const push = result?.results?.channels?.push;
      console.log("[FCM][bitService] notify result →", {
        event,
        userId: String(userId),
        ok: result?.ok,
        skipped: result?.skipped,
        skipReason: result?.reason,
        pushSent: push?.sent ?? null,
        pushError: push?.error || null,
        deviceCount: push?.deviceCount ?? null,
      });
    })
    .catch((err) =>
      console.error(`[FCM][bitService] notify ${event} FAILED:`, err.message),
    );
}

function buildBidMetadata({
  kind,
  record,
  postDoc,
  postType,
  postId,
  route,
  productDoc,
  loadDoc,
  truckDoc,
  extra = {},
}) {
  const entityType = postType || (kind === 'product' ? 'PRODUCT' : kind.toUpperCase());
  const productPublicId =
    kind === 'product'
      ? postId || entityPublicId(productDoc) || (record?.productId ? String(record.productId) : '')
      : '';
  return {
    postId: postId || null,
    requestId: bitRecordPublicId(record),
    bitRecordId: bitRecordPublicId(record),
    postType: entityType,
    entityType,
    entityId: postId || productPublicId || null,
    productId: productPublicId || null,
    loadId: loadDoc ? entityPublicId(loadDoc) || String(record?.loadId || '') : null,
    truckId: truckDoc ? entityPublicId(truckDoc) || String(record?.truckId || '') : null,
    bidAmount: record?.bit,
    bitReason: record?.bitReason || '',
    bidderId: record?.userId || null,
    bidderName: record?.userName || '',
    route: route || '/admin/portal/notifications',
    ...extra,
  };
}

async function resolveBidNotificationContext(kind, record) {
  const [loadDoc, truckDoc, productDoc] = await Promise.all([
    record.loadId ? Load.findById(record.loadId).lean() : null,
    record.truckId ? Truck.findById(record.truckId).lean() : null,
    record.productId ? BuySellProduct.findById(record.productId).lean() : null,
  ]);

  if (kind === 'product') {
    const productName = productLabel(productDoc);
    const postId = entityPublicId(productDoc);
    return {
      postType: 'PRODUCT',
      postDoc: productDoc,
      postId,
      route: `/portal/products/${postId || ''}`,
      productName,
      entityLabel: productName,
      relatedLabel: '',
      metadata: buildBidMetadata({
        kind,
        record,
        postDoc: productDoc,
        postType: 'PRODUCT',
        postId,
        route: `/portal/products/${postId || ''}`,
        productDoc,
      }),
    };
  }

  if (kind === 'truck') {
    const postId = entityPublicId(truckDoc);
    const relatedLabel = loadDoc ? loadLabel(loadDoc) : '';
    return {
      postType: 'TRUCK',
      postDoc: truckDoc,
      postId,
      route: `/portal/trucks/${postId || ''}`,
      entityLabel: truckLabel(truckDoc),
      relatedLabel: relatedLabel ? `Load: ${relatedLabel}` : '',
      metadata: buildBidMetadata({
        kind,
        record,
        postDoc: truckDoc,
        postType: 'TRUCK',
        postId,
        route: `/portal/trucks/${postId || ''}`,
        loadDoc,
        truckDoc,
      }),
    };
  }

  // load bid
  const postId = entityPublicId(loadDoc);
  const relatedLabel = truckDoc ? truckLabel(truckDoc) : '';
  return {
    postType: 'LOAD',
    postDoc: loadDoc,
    postId,
    route: `/portal/loads/${postId || ''}`,
    entityLabel: loadLabel(loadDoc),
    relatedLabel: relatedLabel ? `Truck: ${relatedLabel}` : '',
    metadata: buildBidMetadata({
      kind,
      record,
      postDoc: loadDoc,
      postType: 'LOAD',
      postId,
      route: `/portal/loads/${postId || ''}`,
      loadDoc,
      truckDoc,
    }),
  };
}

async function notifyOwnersNewBid({ kind, record, userOid, userName, bit, bitReason }) {
  let entityDoc;
  let entityType;

  if (kind === 'load') {
    entityDoc = await Load.findById(record.loadId).lean();
    entityType = 'load';
  } else if (kind === 'truck') {
    entityDoc = await Truck.findById(record.truckId).lean();
    entityType = 'truck';
  } else if (kind === 'product') {
    entityDoc = await BuySellProduct.findById(record.productId).lean();
    entityType = 'product';
  } else {
    return;
  }

  if (!entityDoc) return;

  const ctx = await resolveBidNotificationContext(kind, record);
  const ownerIds = getEntityOwnerObjectIds(entityType, entityDoc);
  const bidderIdStr = userOid ? String(userOid) : '';
  const postTypeLabel = kind === 'product' ? 'product' : kind === 'truck' ? 'truck' : 'load';

  for (const ownerId of ownerIds) {
    if (bidderIdStr && ownerId === bidderIdStr) continue;

    dispatchBidNotify({
      userId: ownerId,
      event: NOTIFICATION_EVENTS.NEW_REQUEST,
      data: {
        userName: userName || (kind === 'product' ? 'Buyer' : 'User'),
        postType: postTypeLabel,
        amount: bit,
        entityLabel: ctx.entityLabel || ctx.productName,
        productName: ctx.productName || ctx.entityLabel,
        relatedLabel:
          kind === 'load' && record.truckId && ctx.relatedLabel
            ? ctx.relatedLabel
            : kind === 'truck' && record.loadId && ctx.relatedLabel
              ? ctx.relatedLabel
              : '',
      },
      metadata: {
        ...ctx.metadata,
        status: 'pending',
        senderId: userOid,
        ownerId,
        bitReason: bitReason || '',
      },
      dedupeKey: `bid_new_${bitRecordPublicId(record)}_${ownerId}`,
    });
  }
}

async function notifyBidderAccepted({ kind, record, reqUser }) {
  if (!record?.userId) return;
  const ctx = await resolveBidNotificationContext(kind, record);

  dispatchBidNotify({
    userId: record.userId,
    event: NOTIFICATION_EVENTS.REQUEST_ACCEPTED,
    data: {
      postType: ctx.postType.toLowerCase(),
      amount: record.bit,
      entityLabel: ctx.entityLabel,
      productName: ctx.productName || ctx.entityLabel,
    },
    metadata: {
      ...ctx.metadata,
      status: 'accept',
      senderId: reqUser?._id,
    },
    dedupeKey: `bid_accept_${bitRecordPublicId(record)}`,
  });
}

async function notifyBidderRejected({
  kind,
  record,
  reqUser,
  rejectionReason,
  rejectionType = 'manual',
}) {
  if (!record?.userId) return;
  const ctx = await resolveBidNotificationContext(kind, record);
  const reason =
    rejectionReason ||
    (rejectionType === 'sibling'
      ? 'Another bid was accepted.'
      : 'The post owner declined your request.');

  dispatchBidNotify({
    userId: record.userId,
    event: NOTIFICATION_EVENTS.REQUEST_REJECTED,
    data: {
      postType: ctx.postType.toLowerCase(),
      amount: record.bit,
      entityLabel: ctx.entityLabel,
      productName: ctx.productName || ctx.entityLabel,
      rejectionReason: reason,
    },
    metadata: {
      ...ctx.metadata,
      status: 'reject',
      rejectionType,
      senderId: reqUser?._id || null,
    },
    dedupeKey: `bid_reject_${bitRecordPublicId(record)}_${rejectionType}`,
  });
}

async function rejectPendingRecords(Model, filter, excludeId, sourceKind) {
  const pending = await Model.find({
    ...filter,
    status: 'pending',
    _id: { $ne: excludeId },
  }).lean();
  if (!pending.length) return [];
  await Model.updateMany(
    { _id: { $in: pending.map((r) => r._id) } },
    { $set: { status: 'reject' } },
  );
  return pending.map((r) => ({ ...r, _sourceKind: sourceKind }));
}

async function notifyAutoRejectedSiblings(acceptedKind, acceptedRecord, rejectedRows, reqUser) {
  for (const row of rejectedRows) {
    const kind = row._sourceKind || 'load';
    if (acceptedRecord.userId && row.userId && String(row.userId) === String(acceptedRecord.userId)) {
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    await notifyBidderRejected({
      kind,
      record: row,
      reqUser,
      rejectionReason: 'Another bid was accepted.',
      rejectionType: 'sibling',
    });
  }
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
  const mapped = await Promise.all(
    records.map((r) => mapBitRecordRow(r, r._sourceKind, entityMaps)),
  );

  const contactIds = [];
  for (const row of mapped) {
    if (row.userId) contactIds.push(String(row.userId));
    const sellerId =
      row.product_owner ||
      (row.product_info && (row.product_info.userid || row.product_info.userId));
    if (sellerId) contactIds.push(String(sellerId));
  }

  const uniqueIds = [...new Set(contactIds.filter(Boolean))];
  if (!uniqueIds.length) return mapped;

  const objectIds = uniqueIds
    .filter((id) => isObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const users = await User.find({
    $or: [{ id: { $in: uniqueIds } }, { _id: { $in: objectIds } }],
  })
    .select('_id id mobile name')
    .lean();

  const contactMap = {};
  users.forEach((u) => {
    const contact = {
      mobile: u.mobile || null,
      name: (u.name && String(u.name).trim()) || null,
    };
    if (u._id) contactMap[String(u._id)] = contact;
    if (u.id) contactMap[String(u.id)] = contact;
  });

  const isPlaceholder = (value) => {
    if (!value || typeof value !== 'string') return true;
    const n = value.trim().toLowerCase();
    return !n || ['buyer', 'seller', 'unknown', 'admin', 'user', 'guest'].includes(n);
  };

  return mapped.map((row) => {
    if (row.type && row.type !== 'product') return row;

    const buyerContact = row.userId ? contactMap[String(row.userId)] : null;
    const sellerId =
      row.product_owner ||
      (row.product_info && (row.product_info.userid || row.product_info.userId));
    const sellerContact = sellerId ? contactMap[String(sellerId)] : null;

    const buyerName =
      (!isPlaceholder(buyerContact?.name) && buyerContact.name) ||
      (!isPlaceholder(row.userName) && row.userName) ||
      row.userName ||
      'Buyer';

    const sellerName =
      (!isPlaceholder(sellerContact?.name) && sellerContact.name) ||
      (!isPlaceholder(row.product_info?.sellerName) && row.product_info.sellerName) ||
      (!isPlaceholder(row.product_info?.created_by) && row.product_info.created_by) ||
      'Seller';

    const productInfo = row.product_info
      ? {
          ...row.product_info,
          sellerName,
          created_by: sellerName,
          seller_mobile: sellerContact?.mobile || row.product_info.seller_mobile || null,
        }
      : row.product_info;

    return {
      ...row,
      userName: buyerName,
      buyer_name: buyerName,
      buyer_mobile: buyerContact?.mobile || row.buyer_mobile || null,
      product_info: productInfo,
    };
  });
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

async function rejectSiblingBids(kind, record, reqUser = null) {
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

  const rejectedRows = [];

  if (kind === 'load' && record.loadId) {
    const [fromLoad, fromTruck, fromProduct] = await Promise.all([
      rejectPendingRecords(
        LoadBitRecord,
        { loadId: record.loadId },
        record._id,
        'load',
      ),
      rejectPendingRecords(
        TruckBitRecord,
        { loadId: record.loadId },
        record._id,
        'truck',
      ),
      rejectPendingRecords(
        ProductBitRecord,
        { loadId: record.loadId },
        record._id,
        'product',
      ),
    ]);
    rejectedRows.push(...fromLoad, ...fromTruck, ...fromProduct);

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
    await notifyAutoRejectedSiblings(kind, record, rejectedRows, reqUser);
    return;
  }

  if (kind === 'truck') {
    if (record.loadId) {
      const [fromTruck, fromLoad] = await Promise.all([
        rejectPendingRecords(
          TruckBitRecord,
          { loadId: record.loadId },
          record._id,
          'truck',
        ),
        rejectPendingRecords(
          LoadBitRecord,
          { loadId: record.loadId },
          record._id,
          'load',
        ),
      ]);
      rejectedRows.push(...fromTruck, ...fromLoad);
    } else if (record.truckId) {
      const [fromTruck, fromLoad] = await Promise.all([
        rejectPendingRecords(
          TruckBitRecord,
          { truckId: record.truckId },
          record._id,
          'truck',
        ),
        rejectPendingRecords(
          LoadBitRecord,
          { truckId: record.truckId },
          record._id,
          'load',
        ),
      ]);
      rejectedRows.push(...fromTruck, ...fromLoad);
    }

    if (record.truckId) {
      await Truck.findByIdAndUpdate(record.truckId, {
        $set: { bit: record.bit, bitReason: record.bitReason || '' },
      });
    }

    await notifyAutoRejectedSiblings(kind, record, rejectedRows, reqUser);
    return;
  }

  if (kind === 'product' && record.productId) {
    const fromProduct = await rejectPendingRecords(
      ProductBitRecord,
      { productId: record.productId },
      record._id,
      'product',
    );
    rejectedRows.push(...fromProduct);
    await notifyAutoRejectedSiblings(kind, record, rejectedRows, reqUser);
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

  await notifyOwnersNewBid({
    kind: type,
    record: saved.toObject ? saved.toObject() : saved,
    userOid,
    userName,
    bit,
    bitReason,
  });

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
  const previousStatus = normalizeStatus(doc.status);
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

  const recordObj = doc.toObject ? doc.toObject() : doc;
  const newStatus = updates.status != null ? updates.status : previousStatus;
  const statusChanged = updates.status != null && newStatus !== previousStatus;

  if (statusChanged && newStatus === 'accept') {
    await rejectSiblingBids(kind, recordObj, reqUser);

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

    await notifyBidderAccepted({ kind, record: recordObj, reqUser });
  } else if (statusChanged && newStatus === 'reject') {
    await notifyBidderRejected({
      kind,
      record: recordObj,
      reqUser,
      rejectionType: 'manual',
    });
  }

  const bitRecord = await mapBitRecordRow(doc, kind);

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