const express = require("express");
const mongoose = require("mongoose");
const Load = require("../schema/load");
const LoadBitRecord = require("../schema/loadBitRecord");
const TruckBitRecord = require("../schema/truckBitRecord");
const Truck = require("../schema/truck");
const Material = require("../schema/material");
const Agent = require("../schema/agent");
const Shipper = require("../schema/shipper");
const Log = require("../schema/log");
const Notification = require("../schema/notification");
const User = require("../schema/user");
const Role = require("../schema/role");
const VehicleType = require("../schema/vehicleType");
const VehicleBodyType = require("../schema/vehicleBodyType");
const FcmToken = require("../schema/firebaseusear");
const IncomeExpense = require("../schema/incomeExpense");
const IncomeExpenseCategory = require("../schema/incomeExpenseCategory");
const sendNotification = require("../Firebase/firebase");
const {
  findByIdOrUuid,
  findByIdOrUuidDoc,
  resolveToObjectId,
  resolveIdsToObjectIds,
  toResponse,
  toResponseList,
} = require("../helpers/uuidHelper");
const publishLoadBidEvent = sendNotification.publishLoadBidEvent;

const loadRouter = express.Router();

async function sendBidPushToUser(userId, title, body) {
  if (!userId) return;
  const tokenDocs = await FcmToken.find({ userId, isActive: true })
    .sort({ lastUsed: -1 })
    .lean();
  
  if (!tokenDocs || tokenDocs.length === 0) return;

  await Promise.all(
    tokenDocs.map(async (tokenDoc) => {
      if (tokenDoc?.token) {
        const result = await sendNotification(tokenDoc.token, title, body);
        if (result?.success) {
           FcmToken.updateOne({ _id: tokenDoc._id }, { $set: { lastUsed: new Date() } }).catch(() => {});
        } else if (result?.invalidToken) {
           FcmToken.updateOne({ _id: tokenDoc._id }, { $set: { isActive: false } }).catch(() => {});
        }
      }
    })
  );
}

async function generateNextLoadNumber() {
  const last = await Truck.findOne(
    { loadNumber: { $exists: true, $ne: null } },
    { loadNumber: 1 },
    { sort: { createdAt: -1 } },
  ).lean();

  if (!last?.loadNumber) return "L001";

  const num = parseInt(last.loadNumber.replace("L", ""), 10);
  return `L${String(num + 1).padStart(3, "0")}`;
}

// Haversine distance in km
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
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Escape regex special chars for safe partial match */
function escapeRegex(s) {
  return String(s)
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Extract address from location (string or { address, ... } object) */
function extractAddress(loc) {
  if (!loc) return "";
  if (typeof loc === "string") return String(loc).trim();
  const addr =
    loc?.address ??
    loc?.addresses ??
    loc?.formatted_address ??
    loc?.formattedAddress ??
    "";
  return String(addr || "").trim();
}

/** Get lng from location (accepts lng or lang) */
function getLng(loc) {
  if (!loc || typeof loc !== "object") return undefined;
  const v = loc.lng ?? loc.lang;
  return v != null
    ? typeof v === "number"
      ? v
      : parseFloat(String(v))
    : undefined;
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

/** Normalize stop_all / stop array to [{ address, lat, lng }] */
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

/** Extract UUID from string, stripping leading/trailing junk */
function extractUuid(s) {
  if (!s || typeof s !== "string") return "";
  const cleaned = String(s).trim();
  const match = cleaned.match(
    /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/,
  );
  return match ? match[0] : cleaned;
}

/** Check if string looks like UUID */
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

/** Extract search params from body */
function extractSearchParams(body) {
  let search = body?.search;
  if (typeof search === "string") {
    try {
      search = JSON.parse(search);
    } catch {
      search = null;
    }
  }

  let pickLoc =
    extractAddress(body?.pickLocation || body?.pickupLocation) ||
    body?.origin ||
    "";
  let dropLoc = extractAddress(body?.dropLocation || body?.destination) || "";
  let vehicleTypeVal = body?.vehicleType || body?.vehicle_type || "";
  let vehicleBodyTypeVal =
    body?.vehicleBodyType || body?.vehicle_body_type || "";

  if (search && typeof search === "object") {
    const first = Array.isArray(search) ? search[0] : search;
    if (first && typeof first === "object") {
      const pickFrom =
        first.pickupLocation || first.pickLocation || first.pickUpLocation;
      const dropFrom = first.dropLocation || first.dropOffLocation;
      const pickStr = pickFrom != null ? extractAddress(pickFrom) : "";
      const dropStr = dropFrom != null ? extractAddress(dropFrom) : "";
      if (pickStr) pickLoc = pickStr;
      if (dropStr) dropLoc = dropStr;
      const vt = first.vehicleType ?? first.vehicle_type;
      if (vt != null && vt !== "") vehicleTypeVal = vt;
      const vbt =
        first.vehicleBodyType ?? first.vehicle_body_type ?? first.vehicle_id;
      if (vbt != null && vbt !== "") vehicleBodyTypeVal = vbt;
    }
  }

  vehicleTypeVal =
    extractUuid(vehicleTypeVal) || String(vehicleTypeVal || "").trim();
  vehicleBodyTypeVal =
    extractUuid(vehicleBodyTypeVal) || String(vehicleBodyTypeVal || "").trim();

  let dateFrom = body?.dateFrom ?? body?.date_from ?? "";
  let dateTo = body?.dateTo ?? body?.date_to ?? "";
  if (search && typeof search === "object") {
    const first = Array.isArray(search) ? search[0] : search;
    if (first && typeof first === "object") {
      if (first.dateFrom != null && first.dateFrom !== "")
        dateFrom = first.dateFrom;
      if (first.dateTo != null && first.dateTo !== "") dateTo = first.dateTo;
      if (first.date != null && first.date !== "") {
        const d = first.date;
        if (!dateFrom) dateFrom = d;
        if (!dateTo) dateTo = d;
      }
    }
  }
  dateFrom =
    typeof dateFrom === "string"
      ? dateFrom.trim()
      : dateFrom
        ? new Date(dateFrom).toISOString().slice(0, 10)
        : "";
  dateTo =
    typeof dateTo === "string"
      ? dateTo.trim()
      : dateTo
        ? new Date(dateTo).toISOString().slice(0, 10)
        : "";

  return {
    pickLoc: String(pickLoc || "").trim(),
    dropLoc: String(dropLoc || "").trim(),
    vehicleTypeVal,
    vehicleBodyTypeVal,
    dateFrom,
    dateTo,
  };
}

/** Parse capacity string to number */
function parseCapacity(s) {
  if (s == null) return undefined;
  const n = parseFloat(String(s).replace(/[^\d.]/g, ""));
  return isNaN(n) ? undefined : n;
}

/**
 * Resolve a vehicleType value (UUID string, ObjectId string, or label) to all
 * possible stored values: the uuid/id string AND the label string.
 */
async function resolveVehicleTypeValues(val) {
  if (!val) return null;
  const str = String(val).trim();

  let doc = await VehicleType.findOne({
    $or: [{ id: str }, { uuid: str }],
  }).lean();

  if (!doc && looksLikeObjectId(str)) {
    doc = await VehicleType.findById(str).lean();
  }

  if (!doc) {
    const regex = new RegExp(`^${escapeRegex(str)}$`, "i");
    doc = await VehicleType.findOne({
      $or: [{ vehicle_type: regex }, { name: regex }],
    }).lean();
  }

  if (doc) {
    return {
      uuid: doc.id || doc.uuid || null,
      label: doc.vehicle_type || doc.name || null,
      _id: doc._id || null,
    };
  }

  return { uuid: str, label: str, _id: null };
}

/**
 * Resolve a vehicleBodyType value (UUID string, ObjectId string, or name) to
 * all possible stored values.
 */
async function resolveVehicleBodyTypeValues(val) {
  if (!val) return null;
  const str = String(val).trim();

  let doc = await VehicleBodyType.findOne({
    $or: [{ id: str }, { uuid: str }],
  }).lean();

  if (!doc && looksLikeObjectId(str)) {
    doc = await VehicleBodyType.findById(str).lean();
  }

  if (!doc) {
    const regex = new RegExp(`^${escapeRegex(str)}$`, "i");
    doc = await VehicleBodyType.findOne({
      $or: [{ vehicle_name: regex }, { name: regex }],
    }).lean();
  }

  if (doc) {
    return {
      uuid: doc.id || doc.uuid || null,
      name: doc.vehicle_name || doc.name || null,
      _id: doc._id || null,
    };
  }

  return { uuid: str, name: str, _id: null };
}

/**
 * Resolve a material value (ObjectId string, UUID/id string) to its _id and label.
 */
async function resolveMaterialValues(val) {
  if (!val) return null;
  const str = String(val).trim();

  let doc = null;

  if (looksLikeObjectId(str)) {
    doc = await Material.findById(str).lean();
  }

  if (!doc) {
    doc = await Material.findOne({ id: str }).lean();
  }

  if (!doc) {
    const regex = new RegExp(`^${escapeRegex(str)}$`, "i");
    doc = await Material.findOne({ materials_type: regex }).lean();
  }

  if (doc) {
    return {
      _id: doc._id || null,
      uuid: doc.id || null,
      label: doc.materials_type || null,
    };
  }

  return { _id: null, uuid: str, label: str };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: resolve truck IDs from a truckNumber search string
// Returns an array of MongoDB ObjectIds for trucks matching the number.
// ─────────────────────────────────────────────────────────────────────────────
async function resolveTruckIdsByNumber(truckNumberVal) {
  if (!truckNumberVal || !String(truckNumberVal).trim()) return null;
  const q = String(truckNumberVal).trim();
  const regex = new RegExp(escapeRegex(q), "i");

  const trucks = await Truck.find({
    $or: [
      { truckNumber: regex },
      { registrationNumber: regex },
      { truckRegistrationNumber: regex },
    ],
  })
    .select("_id")
    .lean();

  return (trucks || []).map((t) => t._id).filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: given matched truck ObjectIds, find all Load _ids that have an
// accepted bid (status = "accept") for any of those trucks.
// Searches BOTH LoadBitRecord and TruckBitRecord collections.
// This is the correct approach because accepted_truckIds is a computed/
// enriched field — it is NOT stored in the Load document in MongoDB.
// ─────────────────────────────────────────────────────────────────────────────
async function resolveLoadIdsByAcceptedTruckIds(truckObjectIds) {
  if (!truckObjectIds || truckObjectIds.length === 0) return [];

  // Search both bit record collections in parallel
  const [loadBitMatches, truckBitMatches] = await Promise.all([
    LoadBitRecord.find({
      truckId: { $in: truckObjectIds },
      status: "accept",
    })
      .select("loadId")
      .lean(),

    TruckBitRecord.find({
      truckId: { $in: truckObjectIds },
      status: "accept",
    })
      .select("loadId")
      .lean(),
  ]);

  const allLoadIds = [
    ...loadBitMatches.map((r) => r.loadId),
    ...truckBitMatches.map((r) => r.loadId),
  ].filter(Boolean);

  // Deduplicate and return as ObjectIds
  const unique = [
    ...new Map(allLoadIds.map((id) => [id.toString(), id])).values(),
  ];

  return unique;
}

/** Build filter object from search payload */
async function buildLoadSearchFilter(body) {
  const {
    pickLoc,
    dropLoc,
    vehicleTypeVal,
    vehicleBodyTypeVal,
    dateFrom,
    dateTo,
  } = extractSearchParams(body || {});
  const andConditions = [];

  // ── userId / usearid filter — supports single value OR array ─────────────────
  const userIdRaw =
    body?.userId ??
    body?.ownerId ??
    body?.ownerid ??
    body?.userid ??
    body?.usearid;

  if (userIdRaw != null) {
    const userIdArr = Array.isArray(userIdRaw)
      ? userIdRaw.map((v) => String(v).trim()).filter(Boolean)
      : [String(userIdRaw).trim()].filter(Boolean);

    if (userIdArr.length > 0) {
      const resolvedIds = (
        await Promise.all(
          userIdArr.map(async (id) => {
            try {
              if (looksLikeObjectId(id)) {
                return new mongoose.Types.ObjectId(id);
              }
              return await resolveToObjectId(User, id);
            } catch {
              return null;
            }
          }),
        )
      ).filter(Boolean);

      console.log(
        "[userId filter] input:",
        userIdArr,
        "resolved:",
        resolvedIds,
      );

      if (resolvedIds.length > 0) {
        andConditions.push({
          $or: [
            { ownerId: { $in: resolvedIds } },
            { userId: { $in: resolvedIds } },
            { createdBy: { $in: resolvedIds } },
          ],
        });
      }
    }
  }

  // ── userName filter ──────────────────────────────────────────────────────────
  const userNameRaw = body?.userName ?? body?.user_name ?? body?.username;
  if (userNameRaw != null && String(userNameRaw).trim() !== "") {
    const q = String(userNameRaw).trim();
    const regex = new RegExp(escapeRegex(q), "i");
    const users = await User.find({
      $or: [{ name: regex }, { mobile: regex }, { company_name: regex }],
    })
      .select("_id")
      .lean();
    const userIds = (users || []).map((u) => u?._id).filter(Boolean);
    if (userIds.length) {
      andConditions.push({
        $or: [
          { ownerId: { $in: userIds } },
          { userId: { $in: userIds } },
          { createdBy: { $in: userIds } },
        ],
      });
    } else {
      andConditions.push({ _id: { $in: [] } });
    }
  }

  // ── truckNumber filter ───────────────────────────────────────────────────────
  // Accepts: body.truckNumber | body.truck_number | body.truckRegistrationNumber
  //
  // WHY THIS APPROACH:
  //   accepted_truckIds is NOT stored in the Load MongoDB document — it is a
  //   computed field built at runtime from bitRecords + truckbitRecords.
  //   So we cannot query Load.find({ accepted_truckIds: ... }).
  //
  //   Correct flow:
  //     1. Find trucks matching the number  →  truck _ids
  //     2. Find LoadBitRecord + TruckBitRecord with those truck _ids
  //        AND status = "accept"            →  load _ids
  //     3. Filter Load collection by those load _ids
  const truckNumberRaw =
    body?.truckNumber ??
    body?.truck_number ??
    body?.truckRegistrationNumber ??
    body?.truck_registration_number ??
    null;

  if (truckNumberRaw != null && String(truckNumberRaw).trim() !== "") {
    const truckNumberVal = String(truckNumberRaw).trim();
    console.log("[truckNumber filter] searching trucks for:", truckNumberVal);

    // Step 1: find matching truck _ids
    const matchedTruckIds = await resolveTruckIdsByNumber(truckNumberVal);
    console.log("[truckNumber filter] matched truck _ids:", matchedTruckIds);

    if (matchedTruckIds && matchedTruckIds.length > 0) {
      // Step 2: find load _ids that have accepted bids for those trucks
      const matchedLoadIds =
        await resolveLoadIdsByAcceptedTruckIds(matchedTruckIds);
      console.log("[truckNumber filter] matched load _ids:", matchedLoadIds);

      if (matchedLoadIds.length > 0) {
        // Step 3: restrict the Load query to those load _ids
        andConditions.push({ _id: { $in: matchedLoadIds } });
      } else {
        // Trucks found but no accepted bids → return empty
        andConditions.push({ _id: { $in: [] } });
      }
    } else {
      // No trucks matched the number → return empty
      andConditions.push({ _id: { $in: [] } });
    }
  }

  // ── pickup / drop location filter ────────────────────────────────────────────
  if (pickLoc) {
    const pick = new RegExp(escapeRegex(pickLoc), "i");
    andConditions.push({
      $or: [
        { origin: pick },
        { "pickupLocation.address": pick },
        { pickupLocations: pick },
      ],
    });
  }

  if (dropLoc) {
    const drop = new RegExp(escapeRegex(dropLoc), "i");
    andConditions.push({
      $or: [
        { destination: drop },
        { "dropLocation.address": drop },
        { dropoffLocations: drop },
      ],
    });
  }

  // ── vehicleType filter ───────────────────────────────────────────────────────
  if (vehicleTypeVal) {
    const resolved = await resolveVehicleTypeValues(vehicleTypeVal);
    const vtConditions = [];

    if (resolved) {
      const valuesToMatch = [
        ...new Set([resolved.uuid, resolved.label].filter(Boolean)),
      ];
      for (const v of valuesToMatch) {
        vtConditions.push({ vehicleType: v });
        vtConditions.push({ truckType: v });
        const re = new RegExp(escapeRegex(v), "i");
        vtConditions.push({ vehicleType: re });
        vtConditions.push({ truckType: re });
      }
      if (resolved._id) {
        vtConditions.push({ vehicleType: resolved._id });
        vtConditions.push({ truckType: resolved._id });
      }
    } else {
      const re = new RegExp(escapeRegex(vehicleTypeVal), "i");
      vtConditions.push({ vehicleType: re });
      vtConditions.push({ truckType: re });
    }

    if (vtConditions.length) andConditions.push({ $or: vtConditions });
  }

  // ── vehicleBodyType filter ───────────────────────────────────────────────────
  if (vehicleBodyTypeVal) {
    const resolved = await resolveVehicleBodyTypeValues(vehicleBodyTypeVal);
    const vbtConditions = [];

    if (resolved) {
      const valuesToMatch = [
        ...new Set([resolved.uuid, resolved.name].filter(Boolean)),
      ];
      for (const v of valuesToMatch) {
        vbtConditions.push({ vehicleBodyType: v });
        const re = new RegExp(escapeRegex(v), "i");
        vbtConditions.push({ vehicleBodyType: re });
      }
      if (resolved._id) {
        vbtConditions.push({ vehicleBodyType: resolved._id });
      }
    } else {
      const re = new RegExp(escapeRegex(vehicleBodyTypeVal), "i");
      vbtConditions.push({ vehicleBodyType: re });
    }

    if (vbtConditions.length) andConditions.push({ $or: vbtConditions });
  }

  // ── date filter ──────────────────────────────────────────────────────────────
  if (dateFrom || dateTo) {
    const orDateConditions = [];
    const dateCond = {};
    if (dateFrom) {
      const s = new Date(dateFrom);
      s.setUTCHours(0, 0, 0, 0);
      dateCond.$gte = s;
    }
    if (dateTo) {
      const e = new Date(dateTo);
      e.setUTCHours(23, 59, 59, 999);
      dateCond.$lte = e;
    }

    if (Object.keys(dateCond).length) {
      orDateConditions.push({ date: dateCond });
      orDateConditions.push({ createdAt: dateCond });
    }

    const exprParts = [];
    if (dateFrom)
      exprParts.push({
        $gte: [
          { $substr: [{ $ifNull: ["$pickupTime", ""] }, 0, 10] },
          dateFrom,
        ],
      });
    if (dateTo)
      exprParts.push({
        $lte: [{ $substr: [{ $ifNull: ["$pickupTime", ""] }, 0, 10] }, dateTo],
      });
    if (exprParts.length) {
      orDateConditions.push({
        $and: [
          {
            pickupTime: {
              $exists: true,
              $ne: null,
              $regex: /^\d{4}-\d{2}-\d{2}/,
            },
          },
          { $expr: { $and: exprParts } },
        ],
      });
    }

    if (orDateConditions.length) {
      andConditions.push(
        orDateConditions.length === 1
          ? orDateConditions[0]
          : { $or: orDateConditions },
      );
    }
  }

  // ── createdAt filter ─────────────────────────────────────────────────────────
  const createdFrom =
    typeof body?.createdFrom === "string"
      ? body.createdFrom.trim()
      : typeof body?.created_from === "string"
        ? body.created_from.trim()
        : "";
  const createdTo =
    typeof body?.createdTo === "string"
      ? body.createdTo.trim()
      : typeof body?.created_to === "string"
        ? body.created_to.trim()
        : "";
  if (createdFrom || createdTo) {
    const c = {};
    if (createdFrom) {
      const s = new Date(createdFrom);
      s.setUTCHours(0, 0, 0, 0);
      c.$gte = s;
    }
    if (createdTo) {
      const e = new Date(createdTo);
      e.setUTCHours(23, 59, 59, 999);
      c.$lte = e;
    }
    if (Object.keys(c).length) andConditions.push({ createdAt: c });
  }

  // ── truck_status filter ──────────────────────────────────────────────────────
  const truckStatusVal = String(body?.truck_status ?? "").trim();
  if (truckStatusVal) {
    andConditions.push({
      truck_status: {
        $regex: `^${escapeRegex(truckStatusVal)}$`,
        $options: "i",
      },
    });
  }

  // ── status filter ─────────────────────────────────────────────────────────
  const statusRaw = body?.status ?? body?.load_status ?? body?.loadStatus;
  if (statusRaw != null) {
    const validStatuses = [
      "pending",
      "assigned",
      "accepted",
      "rejected",
      "delivered",
      "cancelled",
      "draft",
    ];
    const statusArr = Array.isArray(statusRaw)
      ? statusRaw.map((s) => String(s).trim().toLowerCase()).filter(Boolean)
      : [String(statusRaw).trim().toLowerCase()].filter(Boolean);

    const filteredStatuses = statusArr.filter((s) => validStatuses.includes(s));
    if (filteredStatuses.length > 0) {
      andConditions.push({ status: { $in: filteredStatuses } });
    }
  }

  return andConditions.length ? { $and: andConditions } : {};
}

/** Enrich loads with vehicleTypeId, vehicleTypeLabel, vehicle_id, vehicle_name, vehicleCapacity */
async function enrichLoadsWithVehicleType(loads) {
  if (!Array.isArray(loads) || loads.length === 0) return loads;
  const truckIds = [...new Set(loads.map((l) => l.truck_id).filter(Boolean))];
  const trucks =
    truckIds.length > 0
      ? await Truck.find({ _id: { $in: truckIds } }).lean()
      : [];
  const truckById = {};
  for (const t of trucks) truckById[t._id.toString()] = t;

  const [allVTypes, allBodyTypes] = await Promise.all([
    VehicleType.find().lean(),
    VehicleBodyType.find().lean(),
  ]);

  const vtById = {};
  const vtByLabel = {};
  for (const vt of allVTypes) {
    const id = vt.id || vt.uuid;
    const lbl = vt.vehicle_type || vt.name;
    if (id) vtById[id] = vt;
    if (lbl) vtByLabel[lbl.toLowerCase().trim()] = vt;
  }

  const vbtById = {};
  const vbtByName = {};
  for (const vbt of allBodyTypes) {
    const id = vbt.id || vbt.uuid;
    const name = vbt.vehicle_name || vbt.name || "";
    if (id) vbtById[id] = vbt;
    if (name) vbtByName[name.toLowerCase().trim()] = vbt;
  }

  return loads.map((load) => {
    const out = { ...load };

    const vt = load.vehicleType || load.truckType;
    if (vt) {
      const lbl = (d) => d?.vehicle_type || d?.name;
      let vtDoc = null;
      if (looksLikeUuid(vt)) {
        vtDoc = vtById[vt] || null;
      } else {
        const key = String(vt).toLowerCase().trim();
        vtDoc = vtByLabel[key] || null;
      }
      out.vehicleTypeId = vtDoc ? vtDoc.id || vtDoc.uuid : null;
      out.vehicleTypeLabel = vtDoc ? lbl(vtDoc) : vt;
      if (vtDoc && (vtDoc.id || vtDoc.uuid))
        out.vehicleType = vtDoc.id || vtDoc.uuid;
    }

    const vbt = load.vehicleBodyType;
    if (vbt) {
      let vbtDoc = null;
      if (looksLikeUuid(vbt)) {
        vbtDoc = vbtById[vbt] || null;
      } else {
        const key = String(vbt).toLowerCase().trim();
        vbtDoc = vbtByName[key] || null;
      }
      out.vehicle_id = vbtDoc ? vbtDoc.id || vbtDoc.uuid || "" : "";
      out.vehicle_name = vbtDoc
        ? vbtDoc.vehicle_name || vbtDoc.name || vbt
        : vbt;
    } else {
      out.vehicle_id = "";
      out.vehicle_name = "";
    }

    let vehicleCapacity = load.vehicleCapacity;
    if (vehicleCapacity == null && load.truck_id) {
      const truck =
        truckById[
          load.truck_id.toString
            ? load.truck_id.toString()
            : String(load.truck_id)
        ];
      if (truck) vehicleCapacity = parseCapacity(truck.capacity);
    }
    if (vehicleCapacity == null && load.truckCapacity != null)
      vehicleCapacity = parseCapacity(load.truckCapacity);
    if (vehicleCapacity == null && (load.vehicleType || load.truckType)) {
      const vtVal = load.vehicleType || load.truckType;
      let vtDoc = null;
      if (looksLikeUuid(vtVal)) {
        vtDoc = vtById[vtVal] || null;
      } else {
        const key = String(vtVal).toLowerCase().trim();
        vtDoc =
          vtByLabel[key] ||
          Object.values(vtByLabel).find(
            (v) => (v.vehicle_type || v.name || "").toLowerCase() === key,
          ) ||
          null;
      }
      if (vtDoc && (vtDoc.maximumCapacity || vtDoc.minimumCapacity)) {
        vehicleCapacity = parseCapacity(
          vtDoc.maximumCapacity || vtDoc.minimumCapacity,
        );
      }
    }
    out.vehicleCapacity = vehicleCapacity != null ? vehicleCapacity : null;

    return out;
  });
}


/** Stable remarks key used to detect duplicate delivery transactions for a load. */
function buildDeliveryTransactionRemarks(load) {
  const loadId = load._id?.toString?.() || String(load._id);
  const loadNumber = load.loadNumber || loadId;
  return `Auto: Load delivery – ${loadNumber} [load:${loadId}]`;
}

/** Resolve accepted truck ObjectId from load document, with bid-record fallback. */
async function resolveDeliveryTruckId(load) {
  const logPrefix = `[resolveDeliveryTruckId load=${load._id}]`;

  if (load.truck_id) {
    console.log(`${logPrefix} using load.truck_id=${load.truck_id}`);
    return load.truck_id;
  }

  const acceptedFirst = load.accepted_truckIds?.[0];
  if (acceptedFirst) {
    const truckId =
      acceptedFirst._id ||
      (mongoose.Types.ObjectId.isValid(String(acceptedFirst))
        ? acceptedFirst
        : null);
    if (truckId) {
      console.log(`${logPrefix} using load.accepted_truckIds[0]=${truckId}`);
      return truckId;
    }
  }

  console.log(
    `${logPrefix} truck_id and accepted_truckIds empty — querying bid records`,
  );
  const loadId = load._id;
  const [loadBit, truckBit] = await Promise.all([
    LoadBitRecord.findOne({ loadId, status: "accept" })
      .select("truckId")
      .lean(),
    TruckBitRecord.findOne({ loadId, status: "accept" })
      .select("truckId")
      .lean(),
  ]);
  const truckId = loadBit?.truckId || truckBit?.truckId || null;
  if (truckId) {
    console.log(`${logPrefix} resolved truckId=${truckId} from bid records`);
  } else {
    console.log(`${logPrefix} no accepted truck found in bid records`);
  }
  return truckId;
}

/** Find an active IncomeExpenseCategory for auto delivery transactions. */
async function findDeliveryCategory(type) {
  const logPrefix = `[findDeliveryCategory type=${type}]`;
  const namePatterns = [/load/i, /freight/i, /transport/i, /delivery/i];

  for (const pattern of namePatterns) {
    const cat = await IncomeExpenseCategory.findOne({
      type,
      status: "Active",
      categoryName: pattern,
    }).lean();
    if (cat) {
      console.log(
        `${logPrefix} matched category "${cat.categoryName}" (_id=${cat._id})`,
      );
      return cat;
    }
  }

  const fallback = await IncomeExpenseCategory.findOne({
    type,
    status: "Active",
  }).lean();
  if (fallback) {
    console.log(
      `${logPrefix} using first active category "${fallback.categoryName}" (_id=${fallback._id})`,
    );
  } else {
    console.log(`${logPrefix} EARLY RETURN: no active ${type} category found`);
  }
  return fallback;
}

/**
 * When load status transitions to delivered, create:
 * - Income for truck owner (Truck.ownerId)
 * - Expense for load owner (load.ownerId)
 * Amount = load.bit. Runs at most once per load.
 */
async function createDeliveryTransactions(loadDoc, oldStatus) {
  const loadId = loadDoc._id?.toString?.() || String(loadDoc._id);
  const logPrefix = `[createDeliveryTransactions load=${loadId}]`;

  console.log(
    `${logPrefix} START oldStatus=${oldStatus} newStatus=${loadDoc.status}`,
  );

  const newStatus = String(loadDoc.status || "").toLowerCase();
  const prevStatus = String(oldStatus || "").toLowerCase();

  if (newStatus !== "delivered") {
    console.log(
      `${logPrefix} EARLY RETURN: new status is not delivered (${newStatus})`,
    );
    return { skipped: true, reason: "not_delivered" };
  }

  if (prevStatus === "delivered") {
    console.log(
      `${logPrefix} EARLY RETURN: load was already delivered (prevStatus=${prevStatus})`,
    );
    return { skipped: true, reason: "already_delivered" };
  }

  if (loadDoc.deliveryTransactionsCreatedAt) {
    console.log(
      `${logPrefix} EARLY RETURN: deliveryTransactionsCreatedAt already set (${loadDoc.deliveryTransactionsCreatedAt})`,
    );
    return { skipped: true, reason: "already_created" };
  }

  const amount =
    loadDoc.bit != null && !isNaN(Number(loadDoc.bit))
      ? Number(loadDoc.bit)
      : null;
  if (amount == null || amount <= 0) {
    console.log(
      `${logPrefix} EARLY RETURN: invalid load.bit amount (${loadDoc.bit})`,
    );
    return { skipped: true, reason: "invalid_amount" };
  }

  const loadOwnerId =
    loadDoc.ownerId || loadDoc.userId || loadDoc.createdBy || null;
  if (!loadOwnerId) {
    console.log(
      `${logPrefix} EARLY RETURN: load owner not found (ownerId/userId/createdBy all empty)`,
    );
    return { skipped: true, reason: "missing_load_owner" };
  }
  console.log(`${logPrefix} loadOwnerId=${loadOwnerId}`);

  const truckId = await resolveDeliveryTruckId(loadDoc);
  if (!truckId) {
    console.log(
      `${logPrefix} EARLY RETURN: accepted truck could not be resolved`,
    );
    return { skipped: true, reason: "missing_truck" };
  }

  const truck = await Truck.findById(truckId).select("ownerId").lean();
  if (!truck) {
    console.log(
      `${logPrefix} EARLY RETURN: truck document not found for truckId=${truckId}`,
    );
    return { skipped: true, reason: "truck_not_found" };
  }

  const truckOwnerId = truck.ownerId || null;
  if (!truckOwnerId) {
    console.log(
      `${logPrefix} EARLY RETURN: truck.ownerId missing for truckId=${truckId}`,
    );
    return { skipped: true, reason: "missing_truck_owner" };
  }
  console.log(`${logPrefix} truckOwnerId=${truckOwnerId} truckId=${truckId}`);

  const remarks = buildDeliveryTransactionRemarks(loadDoc);
  const [existingIncome, existingExpense] = await Promise.all([
    IncomeExpense.findOne({ type: "income", remarks }).lean(),
    IncomeExpense.findOne({ type: "expense", remarks }).lean(),
  ]);
  if (existingIncome && existingExpense) {
    console.log(
      `${logPrefix} EARLY RETURN: both delivery transactions already exist (remarks="${remarks}")`,
    );
    await Load.findByIdAndUpdate(loadDoc._id, {
      $set: { deliveryTransactionsCreatedAt: new Date() },
    });
    return { skipped: true, reason: "transactions_exist" };
  }

  const claimed = await Load.findOneAndUpdate(
    {
      _id: loadDoc._id,
      $or: [
        { deliveryTransactionsCreatedAt: null },
        { deliveryTransactionsCreatedAt: { $exists: false } },
      ],
    },
    { $set: { deliveryTransactionsCreatedAt: new Date() } },
    { new: true },
  ).lean();

  if (!claimed) {
    console.log(
      `${logPrefix} EARLY RETURN: atomic claim failed — another request may have created transactions`,
    );
    return { skipped: true, reason: "claim_failed" };
  }
  console.log(`${logPrefix} atomic claim succeeded`);

  const [incomeCategory, expenseCategory] = await Promise.all([
    findDeliveryCategory("income"),
    findDeliveryCategory("expense"),
  ]);

  if (!incomeCategory) {
    await Load.findByIdAndUpdate(loadDoc._id, {
      $unset: { deliveryTransactionsCreatedAt: 1 },
    });
    console.log(
      `${logPrefix} EARLY RETURN: no active income category — rolled back claim`,
    );
    return { skipped: true, reason: "missing_income_category" };
  }
  if (!expenseCategory) {
    await Load.findByIdAndUpdate(loadDoc._id, {
      $unset: { deliveryTransactionsCreatedAt: 1 },
    });
    console.log(
      `${logPrefix} EARLY RETURN: no active expense category — rolled back claim`,
    );
    return { skipped: true, reason: "missing_expense_category" };
  }

  let incomeDoc = existingIncome;
  let expenseDoc = existingExpense;

  try {
    if (!incomeDoc) {
      console.log(
        `${logPrefix} BEFORE IncomeExpense.create income amount=${amount} userId=${truckOwnerId} categoryId=${incomeCategory._id}`,
      );
      incomeDoc = await IncomeExpense.create({
        type: "income",
        categoryId: incomeCategory._id,
        remarks,
        amount,
        status: "active",
        userId: truckOwnerId,
      });
      console.log(
        `${logPrefix} AFTER IncomeExpense.create income _id=${incomeDoc._id}`,
      );
    } else {
      console.log(
        `${logPrefix} SKIP income create — already exists _id=${incomeDoc._id}`,
      );
    }

    if (!expenseDoc) {
      console.log(
        `${logPrefix} BEFORE IncomeExpense.create expense amount=${amount} userId=${loadOwnerId} categoryId=${expenseCategory._id}`,
      );
      expenseDoc = await IncomeExpense.create({
        type: "expense",
        categoryId: expenseCategory._id,
        remarks,
        amount,
        status: "active",
        userId: loadOwnerId,
      });
      console.log(
        `${logPrefix} AFTER IncomeExpense.create expense _id=${expenseDoc._id}`,
      );
    } else {
      console.log(
        `${logPrefix} SKIP expense create — already exists _id=${expenseDoc._id}`,
      );
    }
  } catch (err) {
    await Load.findByIdAndUpdate(loadDoc._id, {
      $unset: { deliveryTransactionsCreatedAt: 1 },
    });
    console.error(
      `${logPrefix} IncomeExpense.create FAILED — rolled back claim:`,
      err.message,
    );
    throw err;
  }

  console.log(
    `${logPrefix} SUCCESS income=${incomeDoc._id} expense=${expenseDoc._id}`,
  );
  return {
    skipped: false,
    incomeId: incomeDoc._id,
    expenseId: expenseDoc._id,
  };
}

/** Enrich loads with bitRecords */
async function enrichLoadsWithBitRecords(loads) {
  if (!Array.isArray(loads) || loads.length === 0) return loads;
  const loadIds = [...new Set(loads.map((l) => l._id).filter(Boolean))];
  if (loadIds.length === 0) return loads.map((l) => ({ ...l, bitRecords: [] }));
  const records = await LoadBitRecord.find({ loadId: { $in: loadIds } })
    .sort({ createdAt: 1 })
    .lean();
  const byLoadId = {};
  for (const r of records) {
    const key = r.loadId
      ? r.loadId.toString
        ? r.loadId.toString()
        : String(r.loadId)
      : null;
    if (key) {
      if (!byLoadId[key]) byLoadId[key] = [];
      byLoadId[key].push({ ...r, status: r.status || "pending" });
    }
  }
  return loads.map((l) => {
    const loadIdStr = l._id
      ? l._id.toString
        ? l._id.toString()
        : String(l._id)
      : null;
    return {
      ...l,
      stop_all: Array.isArray(l.stop_all) ? l.stop_all : [],
      bitRecords: loadIdStr ? byLoadId[loadIdStr] || [] : [],
    };
  });
}

/** Enrich loads with truckbitRecords */
async function enrichLoadsWithTruckBitRecords(loads) {
  if (!Array.isArray(loads) || loads.length === 0) return loads;
  const loadIds = [...new Set(loads.map((l) => l._id).filter(Boolean))];
  if (loadIds.length === 0)
    return loads.map((l) => ({ ...l, truckbitRecords: [] }));

  const records = await TruckBitRecord.find({ loadId: { $in: loadIds } })
    .sort({ createdAt: 1 })
    .lean();

  const byLoadId = {};
  for (const r of records) {
    const key = r.loadId
      ? r.loadId.toString
        ? r.loadId.toString()
        : String(r.loadId)
      : null;
    if (key) {
      if (!byLoadId[key]) byLoadId[key] = [];
      byLoadId[key].push({ ...r, status: r.status || "pending" });
    }
  }

  return loads.map((l) => {
    const loadIdStr = l._id
      ? l._id.toString
        ? l._id.toString()
        : String(l._id)
      : null;
    return {
      ...l,
      truckbitRecords: loadIdStr ? byLoadId[loadIdStr] || [] : [],
    };
  });
}

/** Enrich loads with owner (user) details */
async function enrichLoadsWithUserDetails(loads) {
  if (!Array.isArray(loads) || loads.length === 0) return loads;
  const userIds = [
    ...new Set(
      loads.flatMap((l) => [l.ownerId, l.userId, l.createdBy].filter(Boolean)),
    ),
  ]
    .map((id) =>
      id && mongoose.Types.ObjectId.isValid(String(id))
        ? new mongoose.Types.ObjectId(String(id))
        : null,
    )
    .filter(Boolean);
  if (userIds.length === 0)
    return loads.map((l) => ({
      ...l,
      ownerId: l.ownerId || l.userId || l.createdBy,
      ownerUser: null,
    }));
  const users = await User.find({ _id: { $in: userIds } })
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
  return loads.map((l) => {
    const ownerId = l.ownerId || l.userId || l.createdBy;
    const ownerKey = ownerId
      ? ownerId.toString
        ? ownerId.toString()
        : String(ownerId)
      : null;
    return {
      ...l,
      ownerId,
      ownerUser: ownerKey ? userByKey[ownerKey] || null : null,
    };
  });
}

/**
 * Enrich loads with accepted_ids.
 * Collects all truckId values from bitRecords + truckbitRecords where
 * status === "accept", deduped into a plain string array.
 *
 * IMPORTANT: Call this BEFORE enrichAcceptedTrucksWithDetails.
 */
function enrichLoadsWithAcceptedIds(loads) {
  if (!Array.isArray(loads) || loads.length === 0) return loads;

  return loads.map((load) => {
    const extractId = (truckId) => {
      if (!truckId) return null;
      if (typeof truckId === "object" && truckId._id) {
        return String(truckId._id);
      }
      return truckId.toString ? truckId.toString() : String(truckId);
    };

    const fromBit = (load.bitRecords || [])
      .filter(
        (r) => String(r.status || "").toLowerCase() === "accept" && r.truckId,
      )
      .map((r) => extractId(r.truckId))
      .filter(Boolean);

    const fromTruckBit = (load.truckbitRecords || [])
      .filter(
        (r) => String(r.status || "").toLowerCase() === "accept" && r.truckId,
      )
      .map((r) => extractId(r.truckId))
      .filter(Boolean);

    const accepted_truckIds = [...new Set([...fromBit, ...fromTruckBit])];

    const plain =
      typeof load.toObject === "function" ? load.toObject() : { ...load };
    plain.accepted_truckIds = accepted_truckIds;
    return plain;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW: Enrich accepted_truckIds strings → full truck + owner objects
// Call this LAST in the enrichment chain (after enrichLoadsWithAcceptedIds).
//
// Each accepted_truckIds entry becomes:
// {
//   _id, id, truckNumber, registrationNumber, truckType, capacity,
//   vehicleBodyType, total_tire, status, contactNumber, vehicleImage,
//   owner: { _id, id, name, mobile, email }
// }
// ─────────────────────────────────────────────────────────────────────────────
async function enrichAcceptedTrucksWithDetails(loads) {
  if (!Array.isArray(loads) || loads.length === 0) return loads;

  // Collect all unique accepted truck ID strings across all loads
  const allTruckIdStrings = [
    ...new Set(
      loads
        .flatMap((l) => l.accepted_truckIds || [])
        .filter((id) => id && typeof id === "string"),
    ),
  ];

  if (allTruckIdStrings.length === 0) return loads;

  // Convert to ObjectIds (skip invalid ones)
  const allTruckObjectIds = allTruckIdStrings
    .map((id) =>
      mongoose.Types.ObjectId.isValid(id)
        ? new mongoose.Types.ObjectId(id)
        : null,
    )
    .filter(Boolean);

  if (allTruckObjectIds.length === 0) return loads;

  // Single DB call: fetch all matched trucks
  const trucks = await Truck.find({ _id: { $in: allTruckObjectIds } })
    .select(
      "_id id truckNumber registrationNumber truckRegistrationNumber truckType " +
        "capacity loadCapacity vehicleBodyType total_tire truck_status status " +
        "contactNumber vehicleImage vehicleImages ownerId createdBy userId",
    )
    .lean();

  // Collect all unique owner IDs from those trucks
  const ownerIdStrings = [
    ...new Set(
      trucks
        .flatMap((t) => [t.ownerId, t.createdBy, t.userId])
        .filter(Boolean)
        .map((id) => (id.toString ? id.toString() : String(id))),
    ),
  ];

  const ownerObjectIds = ownerIdStrings
    .map((id) =>
      mongoose.Types.ObjectId.isValid(id)
        ? new mongoose.Types.ObjectId(id)
        : null,
    )
    .filter(Boolean);

  // Single DB call: fetch all owners
  const owners =
    ownerObjectIds.length > 0
      ? await User.find({ _id: { $in: ownerObjectIds } })
          .select("_id id name mobile email")
          .lean()
      : [];

  // Build lookup maps
  const ownerMap = {};
  for (const u of owners) {
    ownerMap[u._id.toString()] = {
      _id: u._id,
      id: u.id,
      name: u.name,
      mobile: u.mobile,
      email: u.email,
    };
  }

  const truckMap = {};
  for (const t of trucks) {
    const ownerKey =
      (t.ownerId || t.createdBy || t.userId)?.toString?.() || null;

    truckMap[t._id.toString()] = {
      _id: t._id,
      id: t.id,
      truckNumber:
        t.truckNumber ||
        t.registrationNumber ||
        t.truckRegistrationNumber ||
        null,
      registrationNumber:
        t.registrationNumber || t.truckRegistrationNumber || null,
      truckType: t.truckType || null,
      capacity: t.capacity || null,
      loadCapacity: t.loadCapacity || null,
      vehicleBodyType: t.vehicleBodyType || null,
      total_tire: t.total_tire || null,
      status: t.truck_status || t.status || null,
      contactNumber: t.contactNumber || null,
      vehicleImage: t.vehicleImage || t.vehicleImages?.[0] || null,
      owner: ownerKey ? ownerMap[ownerKey] || null : null,
    };
  }

  // Replace string IDs with enriched truck objects in each load
  return loads.map((load) => {
    const enrichedTrucks = (load.accepted_truckIds || [])
      .map((id) => {
        const idStr = typeof id === "string" ? id : id?.toString?.() || null;
        return idStr ? truckMap[idStr] || null : null;
      })
      .filter(Boolean);

    return {
      ...load,
      accepted_truckIds: enrichedTrucks,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED enrichment pipeline used by all list endpoints
// Order matters:
//   1. vehicleType    → adds vehicleTypeLabel, vehicle_name, vehicleCapacity
//   2. bitRecords     → adds bitRecords[]
//   3. truckBitRecs   → adds truckbitRecords[]
//   4. userDetails    → adds ownerUser
//   5. acceptedIds    → derives accepted_truckIds[] from bit record statuses
//   6. acceptedTrucks → replaces ID strings with full truck+owner objects  ← NEW
// ─────────────────────────────────────────────────────────────────────────────
async function runEnrichmentPipeline(loads) {
  return await enrichAcceptedTrucksWithDetails(
    enrichLoadsWithAcceptedIds(
      await enrichLoadsWithUserDetails(
        await enrichLoadsWithTruckBitRecords(
          await enrichLoadsWithBitRecords(
            await enrichLoadsWithVehicleType(loads),
          ),
        ),
      ),
    ),
  );
}

// ── GET /api/load/all ────────────────────────────────────────────────────────
loadRouter.get("/all", async (req, res) => {
  try {
    const filter = await buildLoadSearchFilter(req.query);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 20),
    );
    const skip = (page - 1) * limit;

    const [loads, total] = await Promise.all([
      Load.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Load.countDocuments(filter),
    ]);

    const enriched = await runEnrichmentPipeline(loads);

    res.status(200).json({
      loads: toResponseList(enriched),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching loads", error: error.message });
  }
});

// ── POST /api/load/all ───────────────────────────────────────────────────────
loadRouter.post("/all", async (req, res) => {
  try {
    const body = req.body || {};
    const page = Math.max(1, parseInt(body.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(body.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = await buildLoadSearchFilter(body);

    const [loads, total] = await Promise.all([
      Load.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Load.countDocuments(filter),
    ]);

    const enriched = await runEnrichmentPipeline(loads);

    return res.status(200).json({
      success: true,
      loads: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error("LOAD ALL ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching loads",
      error: error.message,
    });
  }
});

// ── GET /api/load/my ─────────────────────────────────────────────────────────
loadRouter.get("/my", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId || !String(userId).trim())
      return res
        .status(400)
        .json({ message: "Query userId is required for GET /api/load/my" });
    const resolvedUserId = await resolveToObjectId(User, String(userId).trim());
    if (!resolvedUserId)
      return res.status(404).json({ message: "User not found" });
    const loads = await Load.find({
      $or: [
        { ownerId: resolvedUserId },
        { createdBy: resolvedUserId },
        { userId: resolvedUserId },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    const enriched = await runEnrichmentPipeline(loads);

    res.status(200).json(toResponseList(enriched));
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching my loads", error: error.message });
  }
});

// ── GET /api/load/available ──────────────────────────────────────────────────
loadRouter.get("/available", async (req, res) => {
  try {
    const { location, origin, destination } = req.query;
    const filter = { status: "pending" };
    if (location && String(location).trim()) {
      const loc = String(location).trim();
      filter.$or = [
        { origin: new RegExp(loc, "i") },
        { destination: new RegExp(loc, "i") },
      ];
    }
    if (origin && String(origin).trim())
      filter.origin = new RegExp(String(origin).trim(), "i");
    if (destination && String(destination).trim())
      filter.destination = new RegExp(String(destination).trim(), "i");
    const loads = await Load.find(filter).sort({ createdAt: -1 }).lean();
    res.status(200).json(toResponseList(loads));
  } catch (error) {
    res.status(500).json({
      message: "Error fetching available loads",
      error: error.message,
    });
  }
});

// ── GET /api/load/nearby ─────────────────────────────────────────────────────
loadRouter.get("/nearby", async (req, res) => {
  try {
    const lat = parseFloat(req.query.latitude || req.body?.latitude);
    const lng = parseFloat(req.query.longitude || req.body?.longitude);
    const radiusKm = parseFloat(req.query.radiusKm || req.body?.radiusKm) || 50;
    if (isNaN(lat) || isNaN(lng))
      return res
        .status(400)
        .json({ message: "latitude and longitude are required." });
    const loads = await Load.find({
      status: { $in: ["pending", "assigned"] },
    }).lean();
    const nearby = loads.filter((l) => {
      const pl = l.pickupLocation || l.dropLocation;
      if (!pl || (pl.lat == null && pl.lng == null)) return false;
      return (
        HaversineDistance(lat, lng, Number(pl.lat ?? 0), Number(pl.lng ?? 0)) <=
        radiusKm
      );
    });
    res.status(200).json({ success: true, data: toResponseList(nearby) });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching nearby loads", error: error.message });
  }
});

// ── GET /api/load/by-shipper ─────────────────────────────────────────────────
loadRouter.get("/by-shipper", async (req, res) => {
  try {
    const { shipperId } = req.query;
    if (!shipperId || !String(shipperId).trim())
      return res.status(400).json({ message: "Query shipperId is required" });
    const resolvedShipperId = await resolveToObjectId(
      Shipper,
      String(shipperId).trim(),
    );
    if (!resolvedShipperId)
      return res.status(404).json({ message: "Shipper not found" });
    const loads = await Load.find({ shipperId: resolvedShipperId })
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json(toResponseList(loads));
  } catch (error) {
    res.status(500).json({
      message: "Error fetching loads by shipper",
      error: error.message,
    });
  }
});

// ── GET /api/load/by-agent ───────────────────────────────────────────────────
loadRouter.get("/by-agent", async (req, res) => {
  try {
    const { agentId } = req.query;
    if (!agentId || !String(agentId).trim())
      return res.status(400).json({ message: "Query agentId is required" });
    const resolvedAgentId = await resolveToObjectId(
      Agent,
      String(agentId).trim(),
    );
    if (!resolvedAgentId)
      return res.status(404).json({ message: "Agent not found" });
    const loads = await Load.find({ agentId: resolvedAgentId })
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json(toResponseList(loads));
  } catch (error) {
    res.status(500).json({
      message: "Error fetching loads by agent",
      error: error.message,
    });
  }
});

// ── PUT /api/load/assign-agent ───────────────────────────────────────────────
loadRouter.put("/assign-agent", async (req, res) => {
  try {
    const { loadId, agentId, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};
    if (!loadId || !String(loadId).trim())
      return res.status(400).json({ message: "loadId is required in body" });
    if (!agentId || !String(agentId).trim())
      return res.status(400).json({ message: "agentId is required in body" });
    const resolvedLoadId = await resolveToObjectId(Load, String(loadId).trim());
    const resolvedAgentId = await resolveToObjectId(
      Agent,
      String(agentId).trim(),
    );
    if (!resolvedLoadId)
      return res.status(404).json({ message: "Load not found" });
    if (!resolvedAgentId)
      return res.status(404).json({ message: "Agent not found" });
    const load = await Load.findByIdAndUpdate(
      resolvedLoadId,
      { agentId: resolvedAgentId },
      { new: true, runValidators: true },
    ).lean();
    if (!load) return res.status(404).json({ message: "Load not found" });
    await new Log({
      name: actor.name || "unknown",
      email: actor.mobile || "unknown",
      role: actor.role || "unknown",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `assigned agent to load: ${load.title} (${loadId})`,
    }).save();
    res.status(200).json({
      message: "Agent assigned to load successfully",
      load: toResponse(load),
    });
  } catch (error) {
    res.status(500).json({
      message: "Error assigning agent to load",
      error: error.message,
    });
  }
});

// ── PUT /api/load/cancel/:id ─────────────────────────────────────────────────
loadRouter.put("/cancel/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, user, requestingUser } = req.body || {};
    const actor = user || requestingUser || req.user || {};
    if (!id) return res.status(400).json({ message: "Load ID is required" });
    const resolvedLoadId = await resolveToObjectId(Load, id);
    if (!resolvedLoadId)
      return res.status(404).json({ message: "Load not found" });
    const existing = await Load.findById(resolvedLoadId).lean();
    if (!existing) return res.status(404).json({ message: "Load not found" });
    const rejectReason =
      reason != null ? String(reason).trim() || undefined : undefined;
    const cancelOwnerIdRaw = actor?.id ?? actor?._id;
    const resolvedCancelOwnerId =
      cancelOwnerIdRaw != null && String(cancelOwnerIdRaw).trim() !== ""
        ? await resolveToObjectId(User, String(cancelOwnerIdRaw).trim())
        : null;
    const updateFields = { rejectReason };
    if (resolvedCancelOwnerId)
      updateFields.cancelOwnerId = resolvedCancelOwnerId;
    if (existing.status !== "delivered") updateFields.status = "cancelled";
    const updated = await Load.findByIdAndUpdate(resolvedLoadId, updateFields, {
      new: true,
      runValidators: true,
    }).lean();
    if (!updated) return res.status(404).json({ message: "Load not found" });
    await new Log({
      name: actor.name || "unknown",
      email: actor.mobile || "unknown",
      role: actor.role || "unknown",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `set cancel reason on load: ${updated.title} (${id})${rejectReason ? ` — reason: ${rejectReason}` : ""}`,
    }).save();
    res.status(200).json({
      message: "Cancel reason saved successfully",
      load: toResponse(updated),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error saving cancel reason", error: error.message });
  }
});

async function generateNextLoadNumber() {
  // NOTE: was querying Truck — should query Load
  const last = await Load.findOne(
    { loadNumber: { $exists: true, $ne: null } },
    { loadNumber: 1 },
  )
    .sort({ createdAt: -1 })
    .lean();

  let nextNum = 1;
  if (last?.loadNumber) {
    // Extract trailing digits after the last "L" so a date prefix
    // like "2026-07-03 - L031" still parses correctly.
    const match = last.loadNumber.match(/L(\d+)$/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }

  const seq = `L${String(nextNum).padStart(3, "0")}`;
  const datePrefix = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `${datePrefix} - ${seq}`;
}

// ── POST /api/load/add ───────────────────────────────────────────────────────
loadRouter.post("/add", async (req, res) => {
  try {
    console.log("[Load Add] Request received", JSON.stringify(req.body));
    const {
      title,
      description: descIn,
      discription,
      origin,
      destination,
      status,
      weight,
      shipperId,
      buySellId,
      loaderId,
      truck_id,
      truckRegistrationNumber,
      truckCapacity,
      truckDriverName,
      truckStatus,
      agentId,
      userId,
      ownerId: bodyOwnerId,
      createdBy,
      date,
      mobileNumber,
      loadType,
      distanceKm,
      pickupLocation,
      dropLocation,
      stop,
      stop_all,
      material,
      materialId,
      truckType,
      vehicleBody,
      vehicleBodyType,
      vehicle_id,
      vehicleType,
      vehicleCapacity,
      tyreCount,
      total_tire,
      containerFeet,
      pickupTime,
      price,
      bit,
      bitReason,
      scheduledDate,
      truck_status,
      user,
      requestingUser,
      loadCapacity,
    } = req.body;
    const actor = user || requestingUser || req.user || {};

    const ownerIdRaw = userId ?? bodyOwnerId ?? createdBy ?? req.body?.ownerid;
    const resolvedOwnerId =
      ownerIdRaw != null && String(ownerIdRaw).trim() !== ""
        ? await resolveToObjectId(User, String(ownerIdRaw).trim())
        : null;
    const effectiveOwnerId =
      resolvedOwnerId ||
      (req.isAuthenticated ? req.user?._id : null) ||
      undefined;

    const resolvedTruckId = truck_id
      ? await resolveToObjectId(Truck, truck_id)
      : null;

    let resolvedMaterialId = null;
    let materialName = material || loadType;
    if (materialId) {
      const matResolved = await resolveMaterialValues(
        String(materialId).trim(),
      );
      if (matResolved?._id) {
        resolvedMaterialId = matResolved._id;
        materialName = matResolved.label || materialName;
      } else if (matResolved?.uuid) {
        const matDoc = await Material.findOne({
          id: matResolved.uuid,
        }).lean();
        if (matDoc) {
          resolvedMaterialId = matDoc._id;
          materialName = matDoc.materials_type || materialName;
        }
      }
    }

    let resolvedVehicleTypeVal = vehicleType ?? truckType ?? null;
    if (resolvedVehicleTypeVal) {
      const vtResolved = await resolveVehicleTypeValues(
        String(resolvedVehicleTypeVal).trim(),
      );
      if (vtResolved?.uuid) resolvedVehicleTypeVal = vtResolved.uuid;
    }

    let resolvedVehicleBodyTypeVal = vehicleBodyType ?? vehicle_id ?? null;
    if (resolvedVehicleBodyTypeVal) {
      const vbtResolved = await resolveVehicleBodyTypeValues(
        String(resolvedVehicleBodyTypeVal).trim(),
      );
      if (vbtResolved?.uuid) resolvedVehicleBodyTypeVal = vbtResolved.uuid;
    }

    const normalizeStatus = (s) => (s === "draft" ? "pending" : s);
    const effectiveStatus = resolvedTruckId
      ? normalizeStatus(status) || "assigned"
      : normalizeStatus(status) || "pending";

    const pickupAddr =
      (typeof pickupLocation === "string"
        ? pickupLocation
        : pickupLocation?.address) || undefined;
    const dropAddr =
      (typeof dropLocation === "string"
        ? dropLocation
        : dropLocation?.address) || undefined;
    const pickupLat = getLat(pickupLocation) ?? (pickupAddr ? 0 : undefined);
    const pickupLng = getLng(pickupLocation) ?? (pickupAddr ? 0 : undefined);
    const dropLat = getLat(dropLocation) ?? (dropAddr ? 0 : undefined);
    const dropLng = getLng(dropLocation) ?? (dropAddr ? 0 : undefined);
    const derivedTitle =
      title ||
      (pickupAddr && dropAddr ? `${pickupAddr} → ${dropAddr}` : null) ||
      (material ? material : null) ||
      "Untitled";
    const description = descIn ?? discription;

    let truckDetails = {};
    if (resolvedTruckId) {
      const truck = await Truck.findById(resolvedTruckId).lean();
      if (truck) {
        truckDetails = {
          truckRegistrationNumber: truck.registrationNumber,
          truckCapacity: truck.capacity,
          truckDriverName: truck.driverName,
          truckStatus: truck.status,
          total_tire: truck.total_tire,
          truckType: truck.truckType,
          vehicleBody: truck.vehicleBody,
          vehicleBodyType: truck.vehicleBodyType,
          containerFeet: truck.containerFeet,
          vehicleCapacity: parseCapacity(truck.capacity),
        };
      }
    }

    // Generate the load number before creating the document
    const loadNumber = await generateNextLoadNumber();

    const load = await Load.create({
      loadNumber,
      title: derivedTitle,
      description: description || undefined,
      origin: origin ?? pickupAddr,
      destination: destination ?? dropAddr,
      status: effectiveStatus,
      weight: weight != null ? weight : undefined,
      shipperId: shipperId || undefined,
      buySellId: buySellId || undefined,
      loaderId: loaderId || undefined,
      truck_id: resolvedTruckId || undefined,
      truckRegistrationNumber: resolvedTruckId
        ? truckDetails.truckRegistrationNumber
        : truckRegistrationNumber,
      truckCapacity: resolvedTruckId
        ? truckDetails.truckCapacity
        : truckCapacity,
      truckDriverName: resolvedTruckId
        ? truckDetails.truckDriverName
        : truckDriverName,
      truckStatus: resolvedTruckId ? truckDetails.truckStatus : truckStatus,
      total_tire: resolvedTruckId ? truckDetails.total_tire : total_tire,
      truckType: resolvedTruckId ? truckDetails.truckType : truckType,
      vehicleBody: resolvedTruckId ? truckDetails.vehicleBody : vehicleBody,
      vehicleBodyType:
        resolvedVehicleBodyTypeVal ??
        (resolvedTruckId ? truckDetails.vehicleBodyType : undefined),
      containerFeet: resolvedTruckId
        ? truckDetails.containerFeet
        : containerFeet,
      agentId: agentId || undefined,
      ownerId: effectiveOwnerId,
      createdBy: effectiveOwnerId,
      userId: effectiveOwnerId,
      createdAt: new Date(),
      mobileNumber: mobileNumber || undefined,
      loadType: loadType || undefined,
      distanceKm: distanceKm != null ? Number(distanceKm) : undefined,
      pickupLocation: pickupAddr
        ? { address: pickupAddr, lat: pickupLat, lng: pickupLng }
        : undefined,
      dropLocation: dropAddr
        ? { address: dropAddr, lat: dropLat, lng: dropLng }
        : undefined,
      stop_all: normalizeStopAll(stop_all ?? stop),
      material: materialName || undefined,
      materialId: resolvedMaterialId || undefined,
      vehicleType: resolvedVehicleTypeVal ?? undefined,
      vehicleCapacity: resolvedTruckId
        ? truckDetails.vehicleCapacity
        : vehicleCapacity != null && vehicleCapacity !== ""
          ? parseCapacity(vehicleCapacity)
          : undefined,
      tyreCount: tyreCount || undefined,
      pickupTime: pickupTime || undefined,
      price: price != null ? Number(price) : undefined,
      loadCapacity: loadCapacity != null ? loadCapacity : undefined,
      bit: bit != null ? Number(bit) : undefined,
      bitReason:
        bitReason != null ? String(bitReason).trim() || undefined : undefined,
      date: date || scheduledDate ? new Date(date || scheduledDate) : undefined,
      truck_status: truck_status || undefined,
    });

    await new Log({
      name: actor.name || "unknown",
      email: actor.mobile || "unknown",
      role: actor.role || "unknown",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `added new load: ${load.title} (${load._id})`,
    }).save();

    let truckResponse = null;
    let materialResponse = null;
    if (load.truck_id)
      truckResponse = await Truck.findById(load.truck_id).lean();
    if (load.materialId)
      materialResponse = await Material.findById(load.materialId).lean();

    const [enrichedLoad] = await enrichLoadsWithVehicleType([
      load.toObject ? load.toObject() : load,
    ]);
    const [withBitRecords] = await enrichLoadsWithBitRecords([enrichedLoad]);
    const [withTruckBitRecords] = await enrichLoadsWithTruckBitRecords([
      withBitRecords,
    ]);
    const [withUser] = await enrichLoadsWithUserDetails([withTruckBitRecords]);
    const [withAccepted] = enrichLoadsWithAcceptedIds([withUser]);
    const [withAcceptedTrucks] = await enrichAcceptedTrucksWithDetails([
      withAccepted,
    ]);

    const loadObj = { ...withAcceptedTrucks };
    const excludeKeys = [
      "truckRegistrationNumber",
      "truckCapacity",
      "truckDriverName",
      "truckStatus",
      "truckType",
      "vehicleBody",
      "vehicleType",
      "total_tire",
      "containerFeet",
      "material",
    ];
    excludeKeys.forEach((k) => delete loadObj[k]);

    const finalLoad = toResponse(loadObj);

    res.status(201).json({
      success: true,
      message: "Load created successfully",
      data: {
        loadId: load.id || load.uuid || load._id,
        loadNumber: load.loadNumber,
        status: load.status,
      },
      load: finalLoad,
      truck: toResponse(truckResponse),
      material: toResponse(materialResponse),
    });
  } catch (error) {
    console.error("[Load Add] Error:", error);
    res.status(500).json({
      message: error.message || "Error creating load",
      error: error.message,
    });
  }
});

// ── PUT /api/load/edit/:id ───────────────────────────────────────────────────
loadRouter.put("/edit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description: descIn,
      discription,
      origin,
      destination,
      status,
      weight,
      shipperId,
      buySellId,
      loaderId,
      truck_id,
      truckRegistrationNumber,
      truckCapacity,
      truckDriverName,
      truckStatus,
      agentId,
      userId,
      ownerId: bodyOwnerIdEdit,
      pickupLocation,
      dropLocation,
      stop,
      stop_all,
      material,
      materialId,
      truckType,
      vehicleBody,
      vehicleBodyType,
      vehicle_id,
      vehicleType,
      vehicleCapacity,
      tyreCount,
      total_tire,
      containerFeet,
      pickupTime,
      price,
      bit,
      bitReason,
      scheduledDate,
      date,
      truck_status,
      user,
      requestingUser,
      loadCapacity,
    } = req.body;
    const actor = user || requestingUser || req.user || {};

    if (!id) return res.status(400).json({ message: "Load ID is required" });
    const resolvedLoadId = await resolveToObjectId(Load, id);
    if (!resolvedLoadId)
      return res.status(404).json({ message: "Load not found" });

    // Capture the pre-update status so we can detect a transition into
    // "delivered" after the update below (needed for auto-generating the
    // delivery Income/Expense transactions).
    const preUpdateLoad = await Load.findById(resolvedLoadId)
      .select("status")
      .lean();
    const oldStatus = preUpdateLoad?.status;

    const description = descIn ?? discription;
    const ownerIdRawEdit =
      userId ?? bodyOwnerIdEdit ?? req.body?.ownerid ?? req.body?.createdBy;
    const resolvedOwnerIdUpdate =
      ownerIdRawEdit != null && String(ownerIdRawEdit).trim() !== ""
        ? await resolveToObjectId(User, String(ownerIdRawEdit).trim())
        : undefined;

    const resolvedTruckId = truck_id
      ? await resolveToObjectId(Truck, truck_id)
      : null;

    let resolvedMaterialId = null;
    let materialName = material;
    if (materialId) {
      const matResolved = await resolveMaterialValues(
        String(materialId).trim(),
      );
      if (matResolved?._id) {
        resolvedMaterialId = matResolved._id;
        materialName = matResolved.label || materialName;
      } else if (matResolved?.uuid) {
        const matDoc = await Material.findOne({
          id: matResolved.uuid,
        }).lean();
        if (matDoc) {
          resolvedMaterialId = matDoc._id;
          materialName = matDoc.materials_type || materialName;
        }
      }
    }

    let resolvedVehicleTypeVal = vehicleType ?? truckType ?? undefined;
    if (resolvedVehicleTypeVal != null) {
      const vtResolved = await resolveVehicleTypeValues(
        String(resolvedVehicleTypeVal).trim(),
      );
      if (vtResolved?.uuid) resolvedVehicleTypeVal = vtResolved.uuid;
    }

    let resolvedVehicleBodyTypeVal = vehicleBodyType ?? vehicle_id ?? undefined;
    if (resolvedVehicleBodyTypeVal != null) {
      const vbtResolved = await resolveVehicleBodyTypeValues(
        String(resolvedVehicleBodyTypeVal).trim(),
      );
      if (vbtResolved?.uuid) resolvedVehicleBodyTypeVal = vbtResolved.uuid;
    }

    let truckDetails = {};
    if (resolvedTruckId) {
      const truck = await Truck.findById(resolvedTruckId).lean();
      if (truck) {
        truckDetails = {
          truckRegistrationNumber: truck.registrationNumber,
          truckCapacity: truck.capacity,
          truckDriverName: truck.driverName,
          truckStatus: truck.status,
          total_tire: truck.total_tire,
          truckType: truck.truckType,
          vehicleBody: truck.vehicleBody,
          vehicleBodyType: truck.vehicleBodyType,
          containerFeet: truck.containerFeet,
          vehicleCapacity: parseCapacity(truck.capacity),
        };
      }
    }

    const updateFields = {
      title,
      description: description ?? undefined,
      origin,
      destination,
      status,
      weight,
      shipperId,
      buySellId,
      loaderId,
      truck_id: resolvedTruckId ?? truck_id,
      truckRegistrationNumber: resolvedTruckId
        ? truckDetails.truckRegistrationNumber
        : truckRegistrationNumber,
      truckCapacity: resolvedTruckId
        ? truckDetails.truckCapacity
        : truckCapacity,
      truckDriverName: resolvedTruckId
        ? truckDetails.truckDriverName
        : truckDriverName,
      ...(resolvedTruckId && truckDetails.truckStatus != null
        ? { truckStatus: truckDetails.truckStatus }
        : {}),
      total_tire: resolvedTruckId ? truckDetails.total_tire : total_tire,
      truckType: resolvedTruckId ? truckDetails.truckType : truckType,
      vehicleBody: resolvedTruckId ? truckDetails.vehicleBody : vehicleBody,
      vehicleBodyType:
        resolvedVehicleBodyTypeVal ??
        (resolvedTruckId ? truckDetails.vehicleBodyType : undefined),
      containerFeet: resolvedTruckId
        ? truckDetails.containerFeet
        : containerFeet,
      agentId,
      material: materialName ?? undefined,
      materialId: resolvedMaterialId ?? undefined,
      vehicleType: resolvedVehicleTypeVal ?? undefined,
      tyreCount,
      pickupTime,
      price: price != null ? Number(price) : undefined,
      loadCapacity: loadCapacity != null ? loadCapacity : undefined,
      date: date || scheduledDate ? new Date(date || scheduledDate) : undefined,
      ...(truck_status != null && String(truck_status).trim() !== ""
        ? { truck_status: String(truck_status).trim() }
        : {}),
    };

    if (bit != null && !isNaN(Number(bit))) updateFields.bit = Number(bit);
    if (bitReason != null)
      updateFields.bitReason = String(bitReason).trim() || undefined;

    if (resolvedTruckId)
      updateFields.vehicleCapacity = truckDetails.vehicleCapacity;
    else if (vehicleCapacity != null && vehicleCapacity !== "")
      updateFields.vehicleCapacity = parseCapacity(vehicleCapacity);

    if (resolvedOwnerIdUpdate !== undefined) {
      updateFields.ownerId = resolvedOwnerIdUpdate;
      updateFields.userId = resolvedOwnerIdUpdate;
      updateFields.createdBy = resolvedOwnerIdUpdate;
    }
    if (pickupLocation)
      updateFields.pickupLocation = {
        address: pickupLocation.address || "",
        lat: getLat(pickupLocation) ?? 0,
        lng: getLng(pickupLocation) ?? 0,
      };
    if (dropLocation)
      updateFields.dropLocation = {
        address: dropLocation.address || "",
        lat: getLat(dropLocation) ?? 0,
        lng: getLng(dropLocation) ?? 0,
      };
    if (stop_all !== undefined || stop !== undefined)
      updateFields.stop_all = normalizeStopAll(stop_all ?? stop);
    if (resolvedTruckId && status !== "delivered")
      updateFields.status = "assigned";

    Object.keys(updateFields).forEach(
      (k) => updateFields[k] === undefined && delete updateFields[k],
    );

    const updated = await Load.findByIdAndUpdate(resolvedLoadId, updateFields, {
      new: true,
      runValidators: true,
    }).lean();
    if (!updated) return res.status(404).json({ message: "Load not found" });

    // ── Auto-create delivery Income/Expense transactions ──────────────────
    // Only fires on the transition into "delivered" (never on bid accept).
    // The atomic findOneAndUpdate guard (transactionCreated: { $ne: true })
    // ensures that even if this route is called again for an already
    // delivered load, transactions are never duplicated on success. On
    // failure, the flag is reverted so a later edit can retry cleanly.
    try {
      console.log("[delivery-transactions] status transition check:", {
        loadId: String(updated._id),
        oldStatus,
        newStatus: updated.status,
      });
      if (oldStatus !== "delivered" && updated.status === "delivered") {
        const flagged = await Load.findOneAndUpdate(
          { _id: updated._id, transactionCreated: { $ne: true } },
          { $set: { transactionCreated: true } },
          { new: true },
        ).lean();
        if (flagged) {
          const ok = await createDeliveryTransactions(flagged);
          if (!ok) {
            console.log(
              `[delivery-transactions] Creation failed for load ${updated._id} — reverting transactionCreated so it can be retried`,
            );
            await Load.findByIdAndUpdate(updated._id, {
              $set: { transactionCreated: false },
            });
          }
        } else {
          console.log(
            `[delivery-transactions] Transaction already created for load ${updated._id} — skipping (transactionCreated was already true)`,
          );
        }
      }
    } catch (txnErr) {
      console.error(
        `[delivery-transactions] Error handling delivery transaction flow for load ${updated._id}:`,
        txnErr,
      );
    }

    await new Log({
      name: actor.name || "unknown",
      email: actor.mobile || "unknown",
      role: actor.role || "unknown",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `updated load: ${updated.title} (${id})`,
    }).save();

    const [withVehicleType] = await enrichLoadsWithVehicleType([updated]);
    const [withBitRecords] = await enrichLoadsWithBitRecords([withVehicleType]);
    const [withTruckBitRecords] = await enrichLoadsWithTruckBitRecords([
      withBitRecords,
    ]);
    const [withUserDetails] = await enrichLoadsWithUserDetails([
      withTruckBitRecords,
    ]);
    const [withAccepted] = enrichLoadsWithAcceptedIds([withUserDetails]);
    const [enriched] = await enrichAcceptedTrucksWithDetails([withAccepted]);

    res.status(200).json({
      message: "Load updated successfully",
      load: toResponse(enriched),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating load", error: error.message });
  }
});

// ── GET /api/load/:id ────────────────────────────────────────────────────────
loadRouter.get("/:id", async (req, res) => {
  try {
    const load = await findByIdOrUuid(Load, req.params.id);
    if (!load) return res.status(404).json({ message: "Load not found" });

    const [withVehicleAndBit] = await enrichLoadsWithBitRecords(
      await enrichLoadsWithVehicleType([load]),
    );
    const [withTruckBit] = await enrichLoadsWithTruckBitRecords([
      withVehicleAndBit,
    ]);
    const [enriched] = await enrichLoadsWithUserDetails([withTruckBit]);

    // ── Enrich truckbitRecords with truck info ──────────────────────
    if (
      Array.isArray(enriched.truckbitRecords) &&
      enriched.truckbitRecords.length > 0
    ) {
      const resolvedTruckIds = (
        await Promise.all(
          enriched.truckbitRecords.map(async (r) => {
            if (!r.truckId) return null;
            const idStr = String(r.truckId).trim();
            try {
              if (looksLikeObjectId(idStr))
                return new mongoose.Types.ObjectId(idStr);
              return await resolveToObjectId(Truck, idStr);
            } catch {
              return null;
            }
          }),
        )
      ).filter(Boolean);

      const trucks =
        resolvedTruckIds.length > 0
          ? await Truck.find({ _id: { $in: resolvedTruckIds } })
              .select(
                "_id id registrationNumber truckNumber truckType capacity loadCapacity containerFeet vehicleBody vehicleBodyType total_tire truck_status status currentLocation contactNumber vehicleImage vehicleImages ownerId createdBy vehicleType",
              )
              .lean()
          : [];

      const truckMap = {};
      for (const t of trucks) truckMap[t._id.toString()] = t;

      enriched.truckbitRecords = enriched.truckbitRecords.map((r) => {
        const idStr = r.truckId ? String(r.truckId).trim() : null;
        return { ...r, truck: idStr ? truckMap[idStr] || null : null };
      });
    }

    // ── Enrich bitRecords with truck info ───────────────────────────
    if (Array.isArray(enriched.bitRecords) && enriched.bitRecords.length > 0) {
      const resolvedBitTruckIds = (
        await Promise.all(
          enriched.bitRecords.map(async (r) => {
            if (!r.truckId) return null;
            const idStr = String(r.truckId).trim();
            try {
              if (looksLikeObjectId(idStr))
                return new mongoose.Types.ObjectId(idStr);
              return await resolveToObjectId(Truck, idStr);
            } catch {
              return null;
            }
          }),
        )
      ).filter(Boolean);

      const bitTrucks =
        resolvedBitTruckIds.length > 0
          ? await Truck.find({ _id: { $in: resolvedBitTruckIds } })
              .select(
                "_id id registrationNumber truckNumber truckType capacity loadCapacity containerFeet vehicleBody vehicleBodyType total_tire truck_status status currentLocation contactNumber vehicleImage vehicleImages ownerId createdBy vehicleType",
              )
              .lean()
          : [];

      const bitTruckMap = {};
      for (const t of bitTrucks) bitTruckMap[t._id.toString()] = t;

      enriched.bitRecords = enriched.bitRecords.map((r) => {
        const idStr = r.truckId ? String(r.truckId).trim() : null;
        return { ...r, truck: idStr ? bitTruckMap[idStr] || null : null };
      });
    }

    // ── accepted_truckIds — enrich with full truck+owner details ─────
    const [withAccepted] = enrichLoadsWithAcceptedIds([enriched]);
    const [finalEnriched] = await enrichAcceptedTrucksWithDetails([
      withAccepted,
    ]);

    // Format loadNumber
    if (finalEnriched.createdAt && finalEnriched.loadNumber) {
      finalEnriched.loadNumber = `${new Date(finalEnriched.createdAt).toISOString().split("T")[0]} - ${finalEnriched.loadNumber}`;
    }

    res.status(200).json(toResponse(finalEnriched));
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching load", error: error.message });
  }
});

// ── DELETE /api/load/delete ──────────────────────────────────────────────────
loadRouter.delete("/delete", async (req, res) => {
  try {
    const { ids, user, requestingUser } = req.body;
    const actor = user || requestingUser || req.user || {};
    const idList = Array.isArray(ids) ? ids : ids != null ? [ids] : [];
    if (idList.length === 0)
      return res.status(400).json({
        message: 'ids array is required (e.g. ids: ["id1", "id2"])',
      });
    const resolvedIds = await resolveIdsToObjectIds(Load, idList);
    const result = await Load.deleteMany({ _id: { $in: resolvedIds } });
    const deletedCount = result.deletedCount || 0;
    await new Log({
      name: actor.name || "unknown",
      email: actor.mobile || "unknown",
      role: actor.role || "unknown",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `deleted ${deletedCount} load(s): ${idList.join(", ")}`,
    }).save();
    res.status(200).json({
      message:
        deletedCount === 0
          ? "No loads found to delete"
          : `${deletedCount} load(s) deleted successfully`,
      deletedCount,
      ids: idList,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting load", error: error.message });
  }
});

module.exports = loadRouter;
