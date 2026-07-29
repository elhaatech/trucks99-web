"use strict";

const express = require("express");
const mongoose = require("mongoose");
const Truck = require("../schema/truck");
const TruckBitRecord = require("../schema/truckBitRecord");
const LoadBitRecord = require("../schema/loadBitRecord");
const Load = require("../schema/load");
const Log = require("../schema/log");
const User = require("../schema/user");
const VehicleType = require("../schema/vehicleType");
const VehicleBodyType = require("../schema/vehicleBodyType");
const {
  findByIdOrUuid,
  findByIdOrUuidDoc,
  resolveToObjectId,
  resolveIdsToObjectIds,
  toResponse,
  toResponseList,
} = require("../helpers/uuidHelper");

const truckRouter = express.Router();
const entityName = "truck";

// ─────────────────────────────────────────────────────────────────────────────
// Valid enum values — single source of truth used in both /add and /edit
// ─────────────────────────────────────────────────────────────────────────────
const VALID_STATUS = [
  "available",
  "in-transit",
  "maintenance",
  "unavailable",
  "draft",
];
const VALID_TRUCK_STATUS = [
  "half body",
  "empty body",
  "return truck",
  "forward",
  "",
];
const VALID_LOAD_STATUS = ["full load", "half load", "part load", ""];

/** Escape regex special chars for safe partial match */
function escapeRegex(s) {
  return String(s)
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Extract address from location (string or { address } object) */
function extractAddress(loc) {
  if (!loc) return "";
  if (typeof loc === "string") return String(loc).trim();
  const addr = loc?.address ?? loc?.addresses ?? loc?.formatted_address ?? "";
  return String(addr || "").trim();
}

/** Get lat from location */
function getLat(loc) {
  if (!loc || typeof loc !== "object") return undefined;
  const v = loc.lat;
  return v != null
    ? typeof v === "number"
      ? v
      : parseFloat(String(v))
    : undefined;
}

/**
 * Get lng from location — accepts lng OR lang.
 */
function getLng(loc) {
  if (!loc || typeof loc !== "object") return undefined;
  const v = loc.lng ?? loc.lang;
  return v != null
    ? typeof v === "number"
      ? v
      : parseFloat(String(v))
    : undefined;
}

/** Check if string looks like UUID (8-4-4-4-12) */
function looksLikeUuid(s) {
  return (
    typeof s === "string" &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      s.trim(),
    )
  );
}

/** Check if string looks like a MongoDB ObjectId */
function looksLikeObjectId(s) {
  return typeof s === "string" && /^[a-fA-F0-9]{24}$/.test(s.trim());
}

/**
 * Serialise a truck lean-object into the canonical API response shape.
 */
function serializeTruck(t) {
  if (!t) return null;

  const str = (v) => (v ? (v.toString ? v.toString() : String(v)) : null);

  const routes = Array.isArray(t.routes)
    ? t.routes.map((r) => ({
        _id: str(r._id),
        from: r.from
          ? {
              address: r.from.address || "",
              lat: r.from.lat ?? 0,
              lng: r.from.lng ?? 0,
            }
          : null,
        to: r.to
          ? {
              address: r.to.address || "",
              lat: r.to.lat ?? 0,
              lng: r.to.lng ?? 0,
            }
          : null,
        price: r.price ?? 0,
      }))
    : [];

  const stop_all = Array.isArray(t.stop_all)
    ? t.stop_all.map((s) => ({
        address: s.address || "",
        lat: s.lat ?? 0,
        lng: s.lng ?? 0,
      }))
    : [];

  const vehicleType =
    t.vehicleType &&
    (t.vehicleType._id || t.vehicleType.uuid || t.vehicleType.name)
      ? {
          _id: str(t.vehicleType._id),
          uuid: t.vehicleType.uuid || null,
          name: t.vehicleType.name || null,
        }
      : null;

  // bitRecords — TruckBitRecord docs (bids placed ON this truck), with load info attached
  const bitRecords = Array.isArray(t.bitRecords)
    ? t.bitRecords.map((br) => ({
        ...br,
        _id: str(br._id),
        truckId: str(br.truckId),
        truck_id: str(br.truckId),
        loadId: str(br.loadId),
        load_id: str(br.loadId),
        userId: str(br.userId),
        status: br.status || "pending",
        load: br.load || null,
        createdAt: br.createdAt ? new Date(br.createdAt).toISOString() : null,
        updatedAt: br.updatedAt ? new Date(br.updatedAt).toISOString() : null,
      }))
    : [];

  // loadbitRecords — LoadBitRecord docs that reference this truck, with load info attached
  const loadbitRecords = Array.isArray(t.loadbitRecords)
    ? t.loadbitRecords.map((br) => ({
        ...br,
        _id: str(br._id),
        loadId: str(br.loadId),
        load_id: str(br.loadId),
        truckId: str(br.truckId),
        truck_id: str(br.truckId),
        userId: str(br.userId),
        status: br.status || "pending",
        load: br.load || null,
        createdAt: br.createdAt ? new Date(br.createdAt).toISOString() : null,
        updatedAt: br.updatedAt ? new Date(br.updatedAt).toISOString() : null,
      }))
    : [];

  const ownerUser = t.ownerUser
    ? {
        _id: str(t.ownerUser._id),
        id: t.ownerUser.id || null,
        name: t.ownerUser.name || null,
        mobile: t.ownerUser.mobile || null,
        email: t.ownerUser.email || null,
      }
    : null;

  // Find accepted bid from TruckBitRecords — extract loadId if present
  const acceptedBitRecord = Array.isArray(t.bitRecords)
    ? (t.bitRecords.find((br) => br.status === "accept") ?? null)
    : null;
  const acceptedLoadId = acceptedBitRecord?.loadId
    ? str(acceptedBitRecord.loadId)
    : null;
  const acceptedBitRecordId = acceptedBitRecord?._id
    ? str(acceptedBitRecord._id)
    : null;

  return {
    _id: str(t._id),
    id: t.id || str(t._id),
    truckNumber: t.truckNumber || null,
    registrationNumber: t.registrationNumber || "",
    vehicleType,
    truckType: t.truckType || "",
    capacity: t.capacity || "",
    containerFeet: t.containerFeet || "",
    vehicleBody: t.vehicleBody || "",
    vehicleBodyType: t.vehicleBodyType || "",
    vehicleBodyLength: t.vehicleBodyLength || "",
    total_tire: t.total_tire || "",
    vehicleImage: t.vehicleImage || "",
    vehicleImages: Array.isArray(t.vehicleImages) ? t.vehicleImages : [],
    vehicleRCDocument: t.vehicleRCDocument || "",
    routes,
    stop_all,
    truck_status: t.truck_status || "",
    status: t.status || "available",
    load_status: t.load_status || "",
    currentLocation: t.currentLocation || "",
    contactNumber: t.contactNumber || "",
    dropLocation: t.dropLocation || "",
    price: t.price || "",
    loadCapacity: t.loadCapacity || "",
    bit: t.bit != null ? t.bit : null,
    bitReason: t.bitReason != null ? t.bitReason : null,
    ownerId: str(t.ownerId || t.createdBy),
    createdBy: str(t.createdBy || t.ownerId),
    ownerUser,
    acceptedLoadId, // loadId from the accepted TruckBitRecord (null if none accepted)
    acceptedBitRecordId, // _id of the accepted TruckBitRecord (null if none accepted)
    bitRecords,
    loadbitRecords,
    createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : null,
    updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Offer helpers
// ─────────────────────────────────────────────────────────────────────────────

async function fetchMyOffers(source, userIdRaw) {
  const resolvedUserId = await resolveToObjectId(
    User,
    String(userIdRaw).trim(),
  );
  if (!resolvedUserId)
    return {
      results: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    };

  const page = Math.max(1, parseInt(source?.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(source?.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [bitRecords, total] = await Promise.all([
    TruckBitRecord.find({ userId: resolvedUserId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    TruckBitRecord.countDocuments({ userId: resolvedUserId }),
  ]);

  const truckIds = [
    ...new Set(bitRecords.map((r) => r.truckId).filter(Boolean)),
  ];
  const trucks = truckIds.length
    ? await Truck.find({ _id: { $in: truckIds } }).lean()
    : [];

  const enrichedTrucks = await enrichTrucksWithUserDetails(trucks);
  const enrichedTruckMap = Object.fromEntries(
    enrichedTrucks.map((t) => [t._id.toString(), t]),
  );

  const results = bitRecords.map((bid) => ({
    bid: {
      ...bid,
      truck_id: bid.truckId?.toString(),
      load_id: bid.loadId?.toString() ?? null,
    },
    truck: bid.truckId
      ? serializeTruck(enrichedTruckMap[bid.truckId.toString()] ?? null)
      : null,
  }));

  return {
    results,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

async function generateNextTruckNumber() {
  const last = await Truck.findOne(
    { truckNumber: { $exists: true, $ne: null } },
    { truckNumber: 1 },
    { sort: { createdAt: -1 } },
  ).lean();

  if (!last?.truckNumber) return "T001";

  const num = parseInt(last.truckNumber.replace("T", ""), 10);
  return `T${String(num + 1).padStart(3, "0")}`;
}

async function fetchReceivedOffers(source, userIdRaw) {
  const resolvedUserId = await resolveToObjectId(
    User,
    String(userIdRaw).trim(),
  );
  if (!resolvedUserId)
    return {
      results: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    };

  const page = Math.max(1, parseInt(source?.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(source?.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const myTrucks = await Truck.find({
    $or: [{ ownerId: resolvedUserId }, { createdBy: resolvedUserId }],
  })
    .select("_id")
    .lean();

  const myTruckIds = myTrucks.map((t) => t._id);
  if (myTruckIds.length === 0) {
    return {
      results: [],
      pagination: { page, limit, total: 0, totalPages: 1 },
    };
  }

  const bidFilter = {
    truckId: { $in: myTruckIds },
    userId: { $ne: resolvedUserId },
  };

  const [bitRecords, total] = await Promise.all([
    TruckBitRecord.find(bidFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    TruckBitRecord.countDocuments(bidFilter),
  ]);

  const truckIds = [
    ...new Set(bitRecords.map((r) => r.truckId?.toString()).filter(Boolean)),
  ];
  const trucks = truckIds.length
    ? await Truck.find({ _id: { $in: truckIds } }).lean()
    : [];

  const enrichedTrucks = await enrichTrucksWithUserDetails(trucks);
  const enrichedTruckMap = Object.fromEntries(
    enrichedTrucks.map((t) => [t._id.toString(), t]),
  );

  const bidderIds = [
    ...new Set(bitRecords.map((r) => r.userId).filter(Boolean)),
  ];
  const bidders = bidderIds.length
    ? await User.find({ _id: { $in: bidderIds } })
        .select("_id id name mobile email")
        .lean()
    : [];
  const bidderMap = Object.fromEntries(
    bidders.map((u) => [u._id.toString(), u]),
  );

  const results = bitRecords.map((bid) => ({
    bid: {
      ...bid,
      truck_id: bid.truckId?.toString(),
      load_id: bid.loadId?.toString() ?? null,
    },
    truck: bid.truckId
      ? serializeTruck(enrichedTruckMap[bid.truckId.toString()] ?? null)
      : null,
    bidder: bid.userId ? (bidderMap[bid.userId.toString()] ?? null) : null,
  }));

  return {
    results,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalizers
// ─────────────────────────────────────────────────────────────────────────────

function normalizeRoute(entry) {
  if (!entry || typeof entry !== "object") return null;
  const fromAddr =
    extractAddress(entry.from) || extractAddress(entry.fromAddress);
  const toAddr = extractAddress(entry.to) || extractAddress(entry.toAddress);
  if (!fromAddr || !toAddr) return null;
  const fromLat = getLat(entry.from) ?? 0;
  const fromLng = getLng(entry.from) ?? 0;
  const toLat = getLat(entry.to) ?? 0;
  const toLng = getLng(entry.to) ?? 0;
  const price =
    entry.price != null
      ? typeof entry.price === "number"
        ? entry.price
        : parseFloat(String(entry.price)) || 0
      : 0;
  return {
    from: { address: fromAddr, lat: fromLat, lng: fromLng },
    to: { address: toAddr, lat: toLat, lng: toLng },
    price,
  };
}

function normalizeStopAll(arr) {
  if (!arr || !Array.isArray(arr)) return [];
  return arr
    .filter(Boolean)
    .map((item) => {
      const addr = extractAddress(item);
      const lat = getLat(item);
      const lng = getLng(item);
      return { address: addr || "", lat: lat ?? 0, lng: lng ?? 0 };
    })
    .filter((s) => s.address);
}

function HaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─────────────────────────────────────────────────────────────────────────────
// VehicleType / VehicleBodyType resolvers
// ─────────────────────────────────────────────────────────────────────────────

async function resolveVehicleTypeValues(val) {
  if (!val) return null;
  const str = String(val).trim();
  let doc = await VehicleType.findOne({
    $or: [{ id: str }, { uuid: str }],
  }).lean();
  if (!doc && looksLikeObjectId(str))
    doc = await VehicleType.findById(str).lean();
  if (!doc) {
    const regex = new RegExp(`^${escapeRegex(str)}$`, "i");
    doc = await VehicleType.findOne({
      $or: [{ vehicle_type: regex }, { name: regex }],
    }).lean();
  }
  if (doc)
    return {
      uuid: doc.id || doc.uuid || null,
      label: doc.vehicle_type || doc.name || null,
      _id: doc._id || null,
    };
  return { uuid: str, label: str, _id: null };
}

async function resolveVehicleBodyTypeValues(val) {
  if (!val) return null;
  const str = String(val).trim();
  let doc = await VehicleBodyType.findOne({
    $or: [{ id: str }, { uuid: str }],
  }).lean();
  if (!doc && looksLikeObjectId(str))
    doc = await VehicleBodyType.findById(str).lean();
  if (!doc) {
    const regex = new RegExp(`^${escapeRegex(str)}$`, "i");
    doc = await VehicleBodyType.findOne({
      $or: [{ vehicle_name: regex }, { name: regex }],
    }).lean();
  }
  if (doc)
    return {
      uuid: doc.id || doc.uuid || null,
      name: doc.vehicle_name || doc.name || null,
      _id: doc._id || null,
    };
  return { uuid: str, name: str, _id: null };
}

async function buildVehicleTypeSubdoc(raw) {
  if (!raw) return undefined;
  const resolved = await resolveVehicleTypeValues(String(raw).trim());
  if (!resolved) return undefined;
  return {
    _id: resolved._id || undefined,
    uuid: resolved.uuid || undefined,
    name: resolved.label || undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// extractTruckSearchParams
// ─────────────────────────────────────────────────────────────────────────────

function extractTruckSearchParams(source) {
  let search = source?.search;
  if (typeof search === "string") {
    try {
      search = JSON.parse(search);
    } catch {
      search = null;
    }
  }
  let vehicleNumber = source?.vehicleNumber ?? source?.registrationNumber ?? "";
  let vehicleTypeVal = source?.vehicleType ?? source?.truckType ?? "";
  let vehicleBodyTypeVal = source?.vehicleBodyType ?? "";
  let routeFrom = source?.routeFrom ?? source?.route_from ?? "";
  let routeTo = source?.routeTo ?? source?.route_to ?? "";
  let statusVal = source?.status ?? "";
  let pickupLocation = source?.pickupLocation ?? source?.pickLocation;
  let dropLocation = source?.dropLocation ?? source?.dropOffLocation;
  let radiusKm =
    typeof source?.radiusKm === "number"
      ? source.radiusKm
      : parseFloat(source?.radiusKm) || 10;

  if (search && typeof search === "object") {
    const first = Array.isArray(search) ? search[0] : search;
    if (first && typeof first === "object") {
      if (first.vehicleNumber != null)
        vehicleNumber = first.vehicleNumber ?? vehicleNumber;
      if (first.vehicleType != null)
        vehicleTypeVal = first.vehicleType ?? vehicleTypeVal;
      if (first.vehicleBodyType != null)
        vehicleBodyTypeVal = first.vehicleBodyType ?? vehicleBodyTypeVal;
      const rf =
        first.routeFrom ??
        first.route_from ??
        (first.pickupLocation ? extractAddress(first.pickupLocation) : null) ??
        (first.from ? extractAddress(first.from) : null);
      const rt =
        first.routeTo ??
        first.route_to ??
        (first.dropLocation ? extractAddress(first.dropLocation) : null) ??
        (first.to ? extractAddress(first.to) : null);
      if (rf != null) routeFrom = rf;
      if (rt != null) routeTo = rt;
      if (first.status != null) statusVal = first.status ?? statusVal;
      if (first.pickupLocation != null) pickupLocation = first.pickupLocation;
      if (first.dropLocation != null) dropLocation = first.dropLocation;
      if (first.radiusKm != null)
        radiusKm =
          typeof first.radiusKm === "number"
            ? first.radiusKm
            : parseFloat(first.radiusKm) || 10;
    }
  }

  const pickLat = pickupLocation ? getLat(pickupLocation) : undefined;
  const pickLng = pickupLocation ? getLng(pickupLocation) : undefined;
  const dropLat = dropLocation ? getLat(dropLocation) : undefined;
  const dropLng = dropLocation ? getLng(dropLocation) : undefined;
  if (!routeFrom && pickupLocation) routeFrom = extractAddress(pickupLocation);
  if (!routeTo && dropLocation) routeTo = extractAddress(dropLocation);

  return {
    vehicleNumber: String(vehicleNumber || "").trim(),
    vehicleTypeVal: String(vehicleTypeVal || "").trim(),
    vehicleBodyTypeVal: String(vehicleBodyTypeVal || "").trim(),
    routeFrom: String(routeFrom || "").trim(),
    routeTo: String(routeTo || "").trim(),
    statusVal: String(statusVal || "").trim(),
    pickLat:
      typeof pickLat === "number" && !isNaN(pickLat) ? pickLat : undefined,
    pickLng:
      typeof pickLng === "number" && !isNaN(pickLng) ? pickLng : undefined,
    dropLat:
      typeof dropLat === "number" && !isNaN(dropLat) ? dropLat : undefined,
    dropLng:
      typeof dropLng === "number" && !isNaN(dropLng) ? dropLng : undefined,
    radiusKm: typeof radiusKm === "number" && radiusKm > 0 ? radiusKm : 10,
  };
}

async function buildTruckSearchFilter(body) {
  const andConditions = [];

  let search = body?.search;
  if (typeof search === "string") {
    try {
      search = JSON.parse(search);
    } catch {
      search = null;
    }
  }
  const searchFirst =
    search && typeof search === "object"
      ? Array.isArray(search)
        ? search[0]
        : search
      : null;

  const userIdRaw =
    body?.userId ??
    body?.ownerId ??
    body?.ownerid ??
    body?.userid ??
    body?.usearid;

  if (userIdRaw && String(userIdRaw).trim() !== "") {
    const resolvedUserId = await resolveToObjectId(
      User,
      String(userIdRaw).trim(),
    );
    if (resolvedUserId) {
      andConditions.push({
        $or: [{ ownerId: resolvedUserId }, { createdBy: resolvedUserId }],
      });
    }
  }

  const truckStatusVal = String(body?.truck_status ?? "").trim();
  if (truckStatusVal) {
    andConditions.push({
      truck_status: {
        $regex: `^${escapeRegex(truckStatusVal)}$`,
        $options: "i",
      },
    });
  }

  const statusVal = String(body?.status ?? searchFirst?.status ?? "").trim();
  if (statusVal) {
    andConditions.push({
      status: { $regex: `^${escapeRegex(statusVal)}$`, $options: "i" },
    });
  }

  const vehicleTypeRaw = String(
    body?.vehicleType ??
      body?.truckType ??
      searchFirst?.vehicleType ??
      searchFirst?.truckType ??
      "",
  ).trim();

  if (vehicleTypeRaw) {
    const resolved = await resolveVehicleTypeValues(vehicleTypeRaw);
    const vtConditions = [];
    if (resolved) {
      const vals = [
        ...new Set([resolved.uuid, resolved.label].filter(Boolean)),
      ];
      for (const v of vals) {
        vtConditions.push({ truckType: v });
        vtConditions.push({ "vehicleType.name": v });
        vtConditions.push({ "vehicleType.uuid": v });
        const re = new RegExp(escapeRegex(v), "i");
        vtConditions.push({ truckType: re });
        vtConditions.push({ "vehicleType.name": re });
      }
      if (resolved._id) vtConditions.push({ "vehicleType._id": resolved._id });
    } else {
      const re = new RegExp(escapeRegex(vehicleTypeRaw), "i");
      vtConditions.push({ truckType: re });
      vtConditions.push({ "vehicleType.name": re });
    }
    if (vtConditions.length) andConditions.push({ $or: vtConditions });
  }

  const vehicleBodyTypeRaw = String(
    body?.vehicleBodyType ??
      searchFirst?.vehicleBodyType ??
      searchFirst?.vehicle_id ??
      "",
  ).trim();

  if (vehicleBodyTypeRaw) {
    const resolved = await resolveVehicleBodyTypeValues(vehicleBodyTypeRaw);
    const vbtConditions = [];
    if (resolved) {
      const vals = [...new Set([resolved.uuid, resolved.name].filter(Boolean))];
      for (const v of vals) {
        vbtConditions.push({ vehicleBodyType: v });
        const re = new RegExp(escapeRegex(v), "i");
        vbtConditions.push({ vehicleBodyType: re });
      }
      if (resolved._id) vbtConditions.push({ vehicleBodyType: resolved._id });
    } else {
      const re = new RegExp(escapeRegex(vehicleBodyTypeRaw), "i");
      vbtConditions.push({ vehicleBodyType: re });
    }
    if (vbtConditions.length) andConditions.push({ $or: vbtConditions });
  }

  const vehicleNumberRaw = String(
    body?.vehicleNumber ??
      body?.registrationNumber ??
      searchFirst?.vehicleNumber ??
      "",
  ).trim();
  if (vehicleNumberRaw) {
    const re = new RegExp(escapeRegex(vehicleNumberRaw), "i");
    andConditions.push({ registrationNumber: re });
  }

  const pickupLoc =
    searchFirst?.pickupLocation ??
    searchFirst?.pickLocation ??
    body?.pickupLocation;
  const dropLoc =
    searchFirst?.dropLocation ??
    searchFirst?.dropOffLocation ??
    body?.dropLocation;

  const routeFromText = String(
    body?.routeFrom ??
      body?.route_from ??
      searchFirst?.routeFrom ??
      (pickupLoc ? extractAddress(pickupLoc) : "") ??
      "",
  ).trim();

  const routeToText = String(
    body?.routeTo ??
      body?.route_to ??
      searchFirst?.routeTo ??
      (dropLoc ? extractAddress(dropLoc) : "") ??
      "",
  ).trim();

  if (routeFromText) {
    const re = new RegExp(escapeRegex(routeFromText), "i");
    andConditions.push({
      $or: [
        { "routes.from.address": re },
        { currentLocation: re },
        { "stop_all.address": re },
      ],
    });
  }

  if (routeToText) {
    const re = new RegExp(escapeRegex(routeToText), "i");
    andConditions.push({
      $or: [{ "routes.to.address": re }, { "stop_all.address": re }],
    });
  }

  const loadStatusVal = String(
    body?.load_status ?? searchFirst?.load_status ?? "",
  ).trim();
  if (loadStatusVal) {
    andConditions.push({
      load_status: { $regex: `^${escapeRegex(loadStatusVal)}$`, $options: "i" },
    });
  }

  const filter = andConditions.length ? { $and: andConditions } : {};

  const pickLat = pickupLoc ? getLat(pickupLoc) : undefined;
  const pickLng = pickupLoc ? getLng(pickupLoc) : undefined;
  const dropLat = dropLoc ? getLat(dropLoc) : undefined;
  const dropLng = dropLoc ? getLng(dropLoc) : undefined;

  const hasCoords =
    (pickLat != null && pickLng != null) ||
    (dropLat != null && dropLng != null);
  const radiusKm =
    typeof body?.radiusKm === "number"
      ? body.radiusKm
      : parseFloat(body?.radiusKm ?? searchFirst?.radiusKm ?? "") || 10;

  const locationFilter = hasCoords
    ? { pickLat, pickLng, dropLat, dropLng, radiusKm }
    : null;

  return { filter, locationFilter };
}

// ─────────────────────────────────────────────────────────────────────────────
// Haversine post-filter
// ─────────────────────────────────────────────────────────────────────────────

function filterTrucksByHaversine(
  trucks,
  pickLat,
  pickLng,
  dropLat,
  dropLng,
  radiusKm,
) {
  if (!Array.isArray(trucks)) return trucks;
  const hasPick = pickLat != null && pickLng != null;
  const hasDrop = dropLat != null && dropLng != null;
  if (!hasPick && !hasDrop) return trucks;

  return trucks.filter((t) => {
    if (!t.routes || !Array.isArray(t.routes) || t.routes.length === 0)
      return false;
    return t.routes.some((r) => {
      const from = r?.from;
      const to = r?.to;
      if (!from || !to) return false;
      const fromLat = parseFloat(from.lat);
      const fromLng = parseFloat(from.lng ?? from.lang);
      const toLat = parseFloat(to.lat);
      const toLng = parseFloat(to.lng ?? to.lang);
      if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng))
        return false;
      const pickOk =
        !hasPick ||
        HaversineDistance(pickLat, pickLng, fromLat, fromLng) <= radiusKm;
      const dropOk =
        !hasDrop ||
        HaversineDistance(dropLat, dropLng, toLat, toLng) <= radiusKm;
      return pickOk && dropOk;
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared fetch helper
// ─────────────────────────────────────────────────────────────────────────────

async function fetchTrucksWithFilter(source) {
  const { filter, locationFilter } = await buildTruckSearchFilter(source);

  const page = Math.max(1, parseInt(source?.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(source?.limit, 10) || 20));
  const skip = (page - 1) * limit;

  let list;
  let total;

  if (locationFilter) {
    list = await Truck.find(filter).sort({ createdAt: -1 }).lean();
    const { pickLat, pickLng, dropLat, dropLng, radiusKm } = locationFilter;
    list = filterTrucksByHaversine(
      list,
      pickLat,
      pickLng,
      dropLat,
      dropLng,
      radiusKm,
    );
    total = list.length;
    list = list.slice(skip, skip + limit);
  } else {
    [list, total] = await Promise.all([
      Truck.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Truck.countDocuments(filter),
    ]);
  }

  const withBitRecords = await enrichTrucksWithBitRecords(list);
  const withLoadBitRecords =
    await enrichTrucksWithLoadBitRecords(withBitRecords);
  const enriched = await enrichTrucksWithUserDetails(withLoadBitRecords);

  return {
    trucks: enriched.map(serializeTruck),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Enrichment helpers
// ─────────────────────────────────────────────────────────────────────────────

async function enrichTrucksWithUserDetails(trucks) {
  if (!Array.isArray(trucks) || trucks.length === 0) return trucks;
  const ownerIds = [
    ...new Set(trucks.flatMap((t) => [t.ownerId, t.createdBy].filter(Boolean))),
  ]
    .map((id) =>
      id && mongoose.Types.ObjectId.isValid(String(id))
        ? new mongoose.Types.ObjectId(String(id))
        : null,
    )
    .filter(Boolean);

  if (ownerIds.length === 0)
    return trucks.map((t) => ({ ...t, ownerUser: null }));

  const users = await User.find({ _id: { $in: ownerIds } })
    .select("_id id name mobile email")
    .lean();
  const userByKey = {};
  for (const u of users) {
    const key = u._id ? u._id.toString() : null;
    if (key)
      userByKey[key] = {
        _id: u._id,
        id: u.id,
        name: u.name,
        mobile: u.mobile,
        email: u.email,
      };
  }
  return trucks.map((t) => {
    const ownerId = t.ownerId || t.createdBy;
    const ownerKey = ownerId
      ? ownerId.toString
        ? ownerId.toString()
        : String(ownerId)
      : null;
    return { ...t, ownerUser: ownerKey ? userByKey[ownerKey] || null : null };
  });
}

/** Helper: bulk-fetch Load docs by loadId strings and return a map */
async function buildLoadMap(records) {
  const loadIdStrings = [
    ...new Set(
      records
        .map((r) => (r.loadId ? r.loadId.toString() : null))
        .filter(Boolean),
    ),
  ];

  const loadObjectIds = loadIdStrings
    .map((id) =>
      mongoose.Types.ObjectId.isValid(id)
        ? new mongoose.Types.ObjectId(id)
        : null,
    )
    .filter(Boolean);

  if (!loadObjectIds.length) return {};

  const loadDocs = await Load.find({ _id: { $in: loadObjectIds } })
    .select(
      "_id id loadNumber title origin destination status pickupLocation " +
        "dropLocation vehicleType vehicleBodyType material loadCapacity " +
        "truck_status pickupTime price bit bitReason ownerId userId createdBy",
    )
    .lean();

  const loadMap = {};
  for (const l of loadDocs) loadMap[l._id.toString()] = l;
  return loadMap;
}

/**
 * enrichTrucksWithBitRecords
 * Fetches TruckBitRecord docs for each truck and attaches load info on each record.
 * Result: truck.bitRecords = [ { ...bidFields, load: <loadDoc|null> } ]
 */
async function enrichTrucksWithBitRecords(trucks) {
  if (!Array.isArray(trucks) || trucks.length === 0) return trucks;

  const truckIds = [...new Set(trucks.map((t) => t._id).filter(Boolean))]
    .map((id) => {
      if (id instanceof mongoose.Types.ObjectId) return id;
      if (mongoose.Types.ObjectId.isValid(String(id)))
        return new mongoose.Types.ObjectId(String(id));
      return null;
    })
    .filter(Boolean);

  if (truckIds.length === 0)
    return trucks.map((t) => ({ ...t, bitRecords: [] }));

  const records = await TruckBitRecord.find({ truckId: { $in: truckIds } })
    .sort({ createdAt: 1 })
    .lean();

  // Bulk-fetch all referenced Load docs in one query
  const loadMap = await buildLoadMap(records);

  const byTruckId = {};
  for (const r of records) {
    const key = r.truckId ? r.truckId.toString() : null;
    if (!key) continue;
    if (!byTruckId[key]) byTruckId[key] = [];
    const loadKey = r.loadId ? r.loadId.toString() : null;
    byTruckId[key].push({
      ...r,
      status: r.status || "pending",
      truck_id: r.truckId ? r.truckId.toString() : null,
      load_id: loadKey,
      load: loadKey ? (loadMap[loadKey] ?? null) : null,
    });
  }

  return trucks.map((t) => {
    const truckIdStr = t._id ? t._id.toString() : null;
    const allBitRecords = truckIdStr ? byTruckId[truckIdStr] || [] : [];
    const ownerId = t.ownerId || t.createdBy;
    // Filter out self-bids (owner bidding on their own truck)
    const filteredBitRecords = allBitRecords.filter(
      (br) => br.userId && ownerId && String(br.userId) !== String(ownerId),
    );
    return { ...t, bitRecords: filteredBitRecords };
  });
}

/**
 * enrichTrucksWithLoadBitRecords
 * Fetches LoadBitRecord docs that reference each truck and attaches load info on each record.
 * Result: truck.loadbitRecords = [ { ...bidFields, load: <loadDoc|null> } ]
 * Mirrors exactly how loadRouter attaches truckbitRecords to a load.
 */
async function enrichTrucksWithLoadBitRecords(trucks) {
  if (!Array.isArray(trucks) || trucks.length === 0) return trucks;

  const truckIds = [...new Set(trucks.map((t) => t._id).filter(Boolean))]
    .map((id) => {
      if (id instanceof mongoose.Types.ObjectId) return id;
      if (mongoose.Types.ObjectId.isValid(String(id)))
        return new mongoose.Types.ObjectId(String(id));
      return null;
    })
    .filter(Boolean);

  if (truckIds.length === 0)
    return trucks.map((t) => ({ ...t, loadbitRecords: [] }));

  // LoadBitRecord docs that have truckId = this truck
  const records = await LoadBitRecord.find({ truckId: { $in: truckIds } })
    .sort({ createdAt: 1 })
    .lean();

  // Bulk-fetch all referenced Load docs in one query
  const loadMap = await buildLoadMap(records);

  const byTruckId = {};
  for (const r of records) {
    const key = r.truckId ? r.truckId.toString() : null;
    if (!key) continue;
    if (!byTruckId[key]) byTruckId[key] = [];
    const loadKey = r.loadId ? r.loadId.toString() : null;
    byTruckId[key].push({
      ...r,
      status: r.status || "pending",
      load_id: loadKey,
      truck_id: r.truckId ? r.truckId.toString() : null,
      load: loadKey ? (loadMap[loadKey] ?? null) : null,
    });
  }

  return trucks.map((t) => {
    const truckIdStr = t._id ? t._id.toString() : null;
    return {
      ...t,
      loadbitRecords: truckIdStr ? byTruckId[truckIdStr] || [] : [],
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/truck/all
truckRouter.get("/all", async (req, res) => {
  try {
    const result = await fetchTrucksWithFilter(req.query);
    res.status(200).json(result);
  } catch (error) {
    res
      .status(500)
      .json({ message: `Error fetching ${entityName}s`, error: error.message });
  }
});

// POST /api/truck/all
truckRouter.post("/all", async (req, res) => {
  try {
    const result = await fetchTrucksWithFilter(req.body || {});

    result.trucks = result.trucks.map((truck) => ({
      ...truck,
      truckNumber:
        truck.createdAt && truck.truckNumber
          ? `${new Date(truck.createdAt).toISOString().split("T")[0]} - ${truck.truckNumber}`
          : truck.truckNumber,
    }));

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("TRUCK ALL ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// PATCH /api/truck/:id/status-location
truckRouter.patch("/:id/status-location", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const { status, currentLocation } = body;
    const actor = req.user || {};

    if (!id) return res.status(400).json({ message: "ID is required" });

    const resolvedId = await resolveToObjectId(Truck, id);
    if (!resolvedId)
      return res.status(404).json({ message: `${entityName} not found` });

    const updateFields = {};
    if (status !== undefined && VALID_STATUS.includes(String(status))) {
      updateFields.status = String(status);
    }
    if (currentLocation !== undefined) {
      updateFields.currentLocation =
        currentLocation != null
          ? String(currentLocation).trim() || undefined
          : undefined;
    }
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        message: "At least one of status or currentLocation is required",
      });
    }

    const updated = await Truck.findByIdAndUpdate(resolvedId, updateFields, {
      new: true,
      runValidators: true,
    }).lean();
    if (!updated)
      return res.status(404).json({ message: `${entityName} not found` });

    await new Log({
      name: actor.name || "unknown",
      email: actor.mobile || "unknown",
      role: actor.role || "unknown",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `updated ${entityName} status/location: ${updated.registrationNumber || id} (${id})`,
    }).save();

    res.status(200).json({
      message: `${entityName} status/location updated successfully`,
      truck: serializeTruck(updated),
    });
  } catch (error) {
    res.status(500).json({
      message: `Error updating ${entityName} status/location`,
      error: error.message,
    });
  }
});

// GET /api/truck/routes/:routeId
truckRouter.get("/routes/:routeId", async (req, res) => {
  try {
    const routeId = req.params.routeId;
    const doc = await Truck.findOne({ "routes._id": routeId })
      .select("_id id routes")
      .lean();
    if (!doc) return res.status(404).json({ message: "Route not found" });
    const route = (doc.routes || []).find(
      (r) => String(r._id) === String(routeId),
    );
    if (!route) return res.status(404).json({ message: "Route not found" });
    res.status(200).json({
      ...route,
      _id: String(route._id),
      truckId: doc.id || doc._id.toString(),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching route", error: error.message });
  }
});

// GET /api/truck/:id/routes
truckRouter.get("/:id/routes", async (req, res) => {
  try {
    const doc = await findByIdOrUuidDoc(Truck, req.params.id);
    if (!doc)
      return res.status(404).json({ message: `${entityName} not found` });
    const routes = Array.isArray(doc.routes) ? doc.routes : [];
    let modified = false;
    for (let i = 0; i < routes.length; i++) {
      if (!routes[i]._id) {
        routes[i]._id = new mongoose.Types.ObjectId();
        modified = true;
      }
    }
    if (modified) {
      doc.routes = routes;
      await doc.save();
    }
    const routesPayload = routes.map((r) => {
      const obj = r.toObject ? r.toObject() : { ...r };
      obj._id = String(obj._id || r._id);
      return obj;
    });
    res.status(200).json({ routes: routesPayload });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching truck routes", error: error.message });
  }
});

// POST /api/truck/:id/routes
truckRouter.post("/:id/routes", async (req, res) => {
  try {
    const doc = await findByIdOrUuidDoc(Truck, req.params.id);
    if (!doc)
      return res.status(404).json({ message: `${entityName} not found` });
    const body = req.body || {};
    const rawRoutes = Array.isArray(body.routes)
      ? body.routes
      : body.route
        ? [body.route]
        : [];
    const toAdd = rawRoutes.map(normalizeRoute).filter(Boolean);
    if (toAdd.length === 0)
      return res.status(400).json({
        message:
          "At least one route with from.address and to.address is required",
      });
    const existing = Array.isArray(doc.routes) ? doc.routes : [];
    toAdd.forEach((r) => existing.push(r));
    doc.routes = existing;
    await doc.save();
    res.status(201).json({ message: "Routes added", routes: doc.routes });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error adding truck routes", error: error.message });
  }
});

// PUT /api/truck/:id/routes/:routeId
truckRouter.put("/:id/routes/:routeId", async (req, res) => {
  try {
    const { id: truckId, routeId } = req.params;
    const doc = await findByIdOrUuidDoc(Truck, truckId);
    if (!doc)
      return res.status(404).json({ message: `${entityName} not found` });
    const routes = Array.isArray(doc.routes) ? doc.routes : [];
    const idx = routes.findIndex((r) => String(r._id) === String(routeId));
    if (idx === -1) return res.status(404).json({ message: "Route not found" });
    const body = req.body || {};
    if (body.from != null) {
      const fromAddr = extractAddress(body.from);
      if (fromAddr)
        routes[idx].from = {
          address: fromAddr,
          lat: getLat(body.from) ?? 0,
          lng: getLng(body.from) ?? 0,
        };
    }
    if (body.to != null) {
      const toAddr = extractAddress(body.to);
      if (toAddr)
        routes[idx].to = {
          address: toAddr,
          lat: getLat(body.to) ?? 0,
          lng: getLng(body.to) ?? 0,
        };
    }
    if (body.price != null)
      routes[idx].price =
        typeof body.price === "number"
          ? body.price
          : parseFloat(String(body.price)) || 0;
    doc.routes = routes;
    await doc.save();
    res.status(200).json({
      message: "Route updated",
      route: doc.routes[idx],
      routes: doc.routes,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating truck route", error: error.message });
  }
});

// DELETE /api/truck/:id/routes/:routeId
truckRouter.delete("/:id/routes/:routeId", async (req, res) => {
  try {
    const { id: truckId, routeId } = req.params;
    const doc = await findByIdOrUuidDoc(Truck, truckId);
    if (!doc)
      return res.status(404).json({ message: `${entityName} not found` });
    const routes = Array.isArray(doc.routes) ? doc.routes : [];
    const idx = routes.findIndex((r) => String(r._id) === String(routeId));
    if (idx === -1) return res.status(404).json({ message: "Route not found" });
    routes.splice(idx, 1);
    doc.routes = routes;
    await doc.save();
    res.status(200).json({ message: "Route deleted", routes: doc.routes });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting truck route", error: error.message });
  }
});

// GET /api/truck/:id
truckRouter.get("/:id", async (req, res) => {
  try {
    const item = await findByIdOrUuid(Truck, req.params.id);
    if (!item)
      return res.status(404).json({ message: `${entityName} not found` });
    const [withBitRecords] = await enrichTrucksWithBitRecords([item]);
    const [withLoadBitRecords] = await enrichTrucksWithLoadBitRecords([
      withBitRecords,
    ]);
    const [enriched] = await enrichTrucksWithUserDetails([withLoadBitRecords]);
    if (enriched.createdAt && enriched.truckNumber) {
      enriched.truckNumber = `${new Date(enriched.createdAt).toISOString().split("T")[0]} - ${enriched.truckNumber}`;
    }
    res.status(200).json(serializeTruck(enriched));
  } catch (error) {
    res
      .status(500)
      .json({ message: `Error fetching ${entityName}`, error: error.message });
  }
});

/** Check if vehicleNumber/registrationNumber already exists */
async function isDuplicateVehicleNumber(regNum, excludeId = null) {
  const val = typeof regNum === "string" ? regNum.trim() : "";
  if (!val) return false;
  const filter = {
    registrationNumber: {
      $regex: new RegExp(
        `^${val.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i",
      ),
    },
  };
  if (excludeId) {
    if (/^[a-fA-F0-9]{24}$/.test(String(excludeId))) {
      filter._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    } else {
      filter.id = { $ne: String(excludeId) };
    }
  }
  return !!(await Truck.findOne(filter).select("_id").lean());
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/truck/add — create a new truck
// ─────────────────────────────────────────────────────────────────────────────
truckRouter.post("/add", async (req, res) => {
  try {
    const body = req.body || {};
    const {
      vehicleNumber,
      vehicleCapacity,
      vehicleType,
      vehicleBody,
      vehicleBodyType,
      vehicleBodyLength,
      vehicleTyre,
      vehicleImage,
      vehicleImages,
      vehicleRCDocument,
      stop_all: stopAllIn,
      stop,
      bit: bitIn,
      bitReason: bitReasonIn,
      user,
      requestingUser,
    } = body;

    const registrationNumber = body.registrationNumber ?? vehicleNumber;
    const capacity = body.capacity ?? vehicleCapacity;
    const truckType = body.truckType ?? vehicleType;
    const total_tire = body.total_tire ?? vehicleTyre;
    const currentLocation = body.currentLocation ?? body.current_location;
    const containerFeet = body.containerFeet ?? body.container_feet;
    const dropLocation = body.dropLocation ?? "";
    const price = body.price ?? "";
    const bit = bitIn ?? body?.bitRecord?.bit ?? body?.bidAmount ?? body?.bid;
    const bitReason =
      bitReasonIn ?? body?.bitRecord?.bitReason ?? body?.bidReason;
    const actor = user || requestingUser || req.user || {};

    const rawStatus = String(body.status ?? "available").trim();
    const status = VALID_STATUS.includes(rawStatus) ? rawStatus : "available";

    const rawTruckStatus = String(body.truck_status ?? "").trim();
    const truckStatusToSave = VALID_TRUCK_STATUS.includes(rawTruckStatus)
      ? rawTruckStatus
      : "";

    const rawLoadStatus = String(body.load_status ?? "").trim();
    const loadStatusToSave = VALID_LOAD_STATUS.includes(rawLoadStatus)
      ? rawLoadStatus
      : "";

    let effectiveOwnerId =
      typeof req.isAuthenticated === "function" && req.isAuthenticated()
        ? req.user?._id
        : undefined;
    const ownerIdRaw =
      body?.userId ??
      body?.ownerId ??
      body?.ownerid ??
      body?.userid ??
      body?.usearid ??
      user?._id ??
      requestingUser?._id;
    if (ownerIdRaw != null && String(ownerIdRaw).trim() !== "") {
      effectiveOwnerId =
        (await resolveToObjectId(User, String(ownerIdRaw).trim())) ||
        effectiveOwnerId;
    }

    const regNum = registrationNumber ? String(registrationNumber).trim() : "";
    if (regNum && (await isDuplicateVehicleNumber(regNum))) {
      return res.status(400).json({
        message:
          "Vehicle number already exists. Same vehicle number is not allowed.",
      });
    }

    const vehicleTypeSubdoc = await buildVehicleTypeSubdoc(truckType);
    const truckNumber = await generateNextTruckNumber();

    const item = await Truck.create({
      registrationNumber: regNum,
      truckNumber,
      truckType: truckType != null ? String(truckType).trim() : "",
      vehicleType: vehicleTypeSubdoc,
      capacity: capacity != null ? String(capacity).trim() : "",
      vehicleBody: vehicleBody != null ? String(vehicleBody).trim() : "",
      vehicleBodyType:
        vehicleBodyType != null ? String(vehicleBodyType).trim() : "",
      vehicleBodyLength:
        vehicleBodyLength != null ? String(vehicleBodyLength).trim() : "",
      total_tire: total_tire != null ? String(total_tire).trim() : "",
      containerFeet: containerFeet != null ? String(containerFeet).trim() : "",
      vehicleImage: vehicleImage != null ? String(vehicleImage).trim() : "",
      vehicleImages: Array.isArray(vehicleImages)
        ? vehicleImages.map((v) => String(v).trim()).filter(Boolean)
        : [],
      vehicleRCDocument:
        vehicleRCDocument != null ? String(vehicleRCDocument).trim() : "",
      currentLocation:
        currentLocation != null ? String(currentLocation).trim() : undefined,
      status,
      routes: [],
      stop_all: normalizeStopAll(stopAllIn ?? stop ?? body.stop_all),
      bit: bit != null ? Number(bit) : undefined,
      bitReason:
        bitReason != null ? String(bitReason).trim() || undefined : undefined,
      load_status: loadStatusToSave,
      truck_status: truckStatusToSave,
      dropLocation: String(dropLocation).trim(),
      price: String(price).trim(),
      ownerId: effectiveOwnerId,
      createdBy: effectiveOwnerId,
      loadCapacity:
        body.loadCapacity != null ? String(body.loadCapacity).trim() : "",
    });

    await new Log({
      name: actor.name || "unknown",
      email: actor.mobile || "unknown",
      role: actor.role || "unknown",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `added new ${entityName}: ${item.registrationNumber || item._id}`,
    }).save();

    const [withBitRecords] = await enrichTrucksWithBitRecords([
      item.toObject ? item.toObject() : item,
    ]);
    const [withLoadBitRecords] = await enrichTrucksWithLoadBitRecords([
      withBitRecords,
    ]);
    const [enriched] = await enrichTrucksWithUserDetails([withLoadBitRecords]);
    if (enriched.createdAt && enriched.truckNumber) {
      enriched.truckNumber = `${new Date(enriched.createdAt).toISOString().split("T")[0]} - ${enriched.truckNumber}`;
    }
    res.status(201).json({
      message: `${entityName} created successfully`,
      truck: serializeTruck(enriched),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: `Error creating ${entityName}`, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/truck/edit/:id — update a truck
// ─────────────────────────────────────────────────────────────────────────────
truckRouter.put("/edit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const {
      vehicleNumber,
      vehicleCapacity,
      loadCapacity,
      vehicleType,
      vehicleBodyType,
      vehicleBodyLength,
      vehicleTyre,
      vehicleImage,
      vehicleImages,
      vehicleRCDocument,
      stop_all: stopAllIn,
      stop,
      bit: bitIn,
      bitReason: bitReasonIn,
      userId: bodyUserId,
      userid: bodyUserid,
      usearid: bodyUsearid,
      user,
      requestingUser,
    } = body;

    const registrationNumber = body.registrationNumber ?? vehicleNumber;
    const capacity = body.capacity ?? vehicleCapacity;
    const loadCapacityVal = body.loadCapacity ?? loadCapacity;
    const truckType = body.truckType ?? vehicleType;
    const total_tire = body.total_tire ?? vehicleTyre;
    const vehicleBody = body.vehicleBody ?? body.vehicle_body;
    const currentLocation = body.currentLocation ?? body.current_location;
    const containerFeet = body.containerFeet ?? body.container_feet;
    const bit = bitIn ?? body?.bitRecord?.bit ?? body?.bidAmount ?? body?.bid;
    const bitReason =
      bitReasonIn ?? body?.bitRecord?.bitReason ?? body?.bidReason;
    const actor = user || requestingUser || req.user || {};

    if (!id) return res.status(400).json({ message: "ID is required" });

    const resolvedId = await resolveToObjectId(Truck, id);
    if (!resolvedId)
      return res.status(404).json({ message: `${entityName} not found` });

    const regNum =
      registrationNumber != null
        ? String(registrationNumber).trim()
        : undefined;
    if (
      regNum !== undefined &&
      regNum &&
      (await isDuplicateVehicleNumber(regNum, id))
    ) {
      return res.status(400).json({
        message:
          "Vehicle number already exists. Same vehicle number is not allowed.",
      });
    }

    const updateFields = {};
    if (regNum !== undefined) updateFields.registrationNumber = regNum;

    if (truckType !== undefined) {
      updateFields.truckType =
        truckType != null ? String(truckType).trim() : undefined;
      const vtSubdoc = await buildVehicleTypeSubdoc(truckType);
      if (vtSubdoc) updateFields.vehicleType = vtSubdoc;
    }

    if (capacity !== undefined)
      updateFields.capacity =
        capacity != null ? String(capacity).trim() : undefined;
    if (vehicleBody !== undefined)
      updateFields.vehicleBody =
        vehicleBody != null ? String(vehicleBody).trim() : undefined;
    if (vehicleBodyType !== undefined)
      updateFields.vehicleBodyType =
        vehicleBodyType != null ? String(vehicleBodyType).trim() : undefined;
    if (vehicleBodyLength !== undefined)
      updateFields.vehicleBodyLength =
        vehicleBodyLength != null
          ? String(vehicleBodyLength).trim()
          : undefined;
    if (total_tire !== undefined)
      updateFields.total_tire =
        total_tire != null ? String(total_tire).trim() : undefined;
    if (containerFeet !== undefined)
      updateFields.containerFeet =
        containerFeet != null ? String(containerFeet).trim() : undefined;
    if (vehicleImage !== undefined)
      updateFields.vehicleImage =
        vehicleImage != null ? String(vehicleImage).trim() : undefined;
    if (vehicleImages !== undefined) {
      updateFields.vehicleImages = Array.isArray(vehicleImages)
        ? vehicleImages.map((v) => String(v).trim()).filter(Boolean)
        : [];
    }
    if (loadCapacityVal !== undefined)
      updateFields.loadCapacity =
        loadCapacityVal != null ? String(loadCapacityVal).trim() : undefined;
    if (vehicleRCDocument !== undefined)
      updateFields.vehicleRCDocument =
        vehicleRCDocument != null
          ? String(vehicleRCDocument).trim()
          : undefined;
    if (currentLocation !== undefined)
      updateFields.currentLocation =
        currentLocation != null ? String(currentLocation).trim() : undefined;

    if (body.status !== undefined) {
      const rawStatus = String(body.status).trim();
      if (VALID_STATUS.includes(rawStatus)) {
        updateFields.status = rawStatus;
      }
    }

    if (stopAllIn !== undefined || stop !== undefined) {
      updateFields.stop_all = normalizeStopAll(
        stopAllIn ?? stop ?? body.stop_all,
      );
    }

    if (body.load_status !== undefined) {
      const rawLoadStatus = String(body.load_status).trim();
      updateFields.load_status = VALID_LOAD_STATUS.includes(rawLoadStatus)
        ? rawLoadStatus
        : "";
    }

    if (body.truck_status !== undefined) {
      const rawTruckStatus = String(body.truck_status).trim();
      updateFields.truck_status = VALID_TRUCK_STATUS.includes(rawTruckStatus)
        ? rawTruckStatus
        : "";
    }

    if (body.dropLocation !== undefined)
      updateFields.dropLocation = String(body.dropLocation).trim();
    if (body.price !== undefined)
      updateFields.price = String(body.price).trim();

    if (bit != null && !isNaN(Number(bit))) updateFields.bit = Number(bit);
    if (bitReason !== undefined)
      updateFields.bitReason =
        bitReason != null ? String(bitReason).trim() || undefined : undefined;

    const ownerIdRaw =
      body?.userId ?? body?.ownerId ?? bodyUserId ?? bodyUserid ?? bodyUsearid;
    if (ownerIdRaw != null && String(ownerIdRaw).trim() !== "") {
      const resolvedOwnerId = await resolveToObjectId(
        User,
        String(ownerIdRaw).trim(),
      );
      if (resolvedOwnerId) {
        updateFields.ownerId = resolvedOwnerId;
        updateFields.createdBy = resolvedOwnerId;
      }
    }

    const updated = await Truck.findByIdAndUpdate(resolvedId, updateFields, {
      new: true,
      runValidators: true,
    }).lean();
    if (!updated)
      return res.status(404).json({ message: `${entityName} not found` });

    await new Log({
      name: actor.name || "unknown",
      email: actor.mobile || "unknown",
      role: actor.role || "unknown",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `updated ${entityName}: ${updated.registrationNumber || id} (${id})`,
    }).save();

    const [withBitRecords] = await enrichTrucksWithBitRecords([updated]);
    const [withLoadBitRecords] = await enrichTrucksWithLoadBitRecords([
      withBitRecords,
    ]);
    const [enriched] = await enrichTrucksWithUserDetails([withLoadBitRecords]);
    res.status(200).json({
      message: `${entityName} updated successfully`,
      truck: serializeTruck(enriched),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: `Error updating ${entityName}`, error: error.message });
  }
});

// DELETE /api/truck/delete
truckRouter.delete("/delete", async (req, res) => {
  try {
    const { ids, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};
    const idList = Array.isArray(ids) ? ids : ids != null ? [ids] : [];
    if (idList.length === 0)
      return res
        .status(400)
        .json({ message: 'ids array is required (e.g. ids: ["id1", "id2"])' });

    const resolvedIds = await resolveIdsToObjectIds(Truck, idList);
    const result = await Truck.deleteMany({ _id: { $in: resolvedIds } });
    const deletedCount = result.deletedCount || 0;

    await new Log({
      name: actor.name || "unknown",
      email: actor.mobile || "unknown",
      role: actor.role || "unknown",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `deleted ${deletedCount} ${entityName}(s): ${idList.join(", ")}`,
    }).save();

    res.status(200).json({
      message:
        deletedCount === 0
          ? `No ${entityName}s found to delete`
          : `${deletedCount} ${entityName}(s) deleted successfully`,
      deletedCount,
      ids: idList,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: `Error deleting ${entityName}`, error: error.message });
  }
});

module.exports = truckRouter;
