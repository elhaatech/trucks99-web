const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const XLSX = require("xlsx");
const Razorpay = require("razorpay");
const BuySellProduct = require("../schema/buysellProduct");
const BuySellCart = require("../schema/buySellCart");
const Transaction = require("../schema/transaction");
const Log = require("../schema/log");
const Specification = require("../schema/specificationModel");
const SpecificationValue = require("../schema/specificationValueModel");
const LocationCountry = require("../schema/locationCountry");
const LocationState = require("../schema/locationState");
const LocationCity = require("../schema/locationCity");
const Favorite = require("../schema/favorite");
const ProductBitRecord = require("../schema/productBitRecord");
const MarketItemView = require("../schema/marketItemView");
const User = require("../schema/user"); // NOTE: adjust path if your User model lives elsewhere
const {
  createBuySellTransactions,
  createBuySellPaymentTransactions,
} = require("../services/buySellTransactionService");
const {
  notify,
  NOTIFICATION_EVENTS,
  buildProductPushMetadata,
} = require("../services/notificationService");
const { productLabel } = require("../helpers/productLabel");
const {
  generateNextBsNumber,
  generateNextVehicleId,
  allocateBsNumbers,
  allocateVehicleIds,
  formatBsNumberWithDate,
  resolveVehicleId,
} = require("../helpers/buySellVehicleId");
const {
  findByIdOrUuid,
  resolveToObjectId,
  resolveIdsToObjectIds,
  toResponse,
  toResponseList,
} = require("../helpers/uuidHelper");
const BuySellFeaturedVehicle = require("../schema/buySellFeaturedVehicle");
const {
  activateFeaturedVehicleFromPayment,
  expireStaleFeaturedRecords,
  requestFreePlanFeaturedVehicle,
  makeFeaturedVehicleAdmin,
  updateFeaturedPlacementAdminStatus,
  removeFeaturedPlacementAdmin,
  buildFeaturedPublicMeta,
  isLiveFeaturedPlacement,
  liveFeaturedPlacementQuery,
  pickPreferredFeaturedPlacement,
} = require("../services/buySellFeaturedVehicleService");

const buySellRouter = express.Router();
const entityName = "BuySell Product";

/** Single-segment paths handled by dedicated routes — never treat as product ids. */
const RESERVED_SINGLE_SEGMENT_PATHS = new Set([
  "all",
  "list",
  "add",
  "delete",
  "cart",
  "status-counts",
  "dashboard-stats",
  "recent-vehicles",
  "featured-vehicles",
  "featured-vehicles/list",
  "purchase-list",
  "bulk-upload",
  "payment",
  "book",
  "purchase",
  "edit",
  "bit",
]);

// ─── VALID STATUSES & LIFECYCLE ────────────────────────────────────────────────
// Must match schema enum exactly (all lowercase).
const VALID_STATUSES = [
  "draft",
  "pending",
  "rejected",
  "purchased",
  "sold",
  "booking",
  // Set on the product itself once a buyer's offer is accepted (see PUT
  // /bit/accept/:id). Spelling matches the ProductBitRecord enum on purpose
  // — this codebase uses "accepeted", not "accept"/"accepted".
  "accepeted",
];

/** Allowed status transitions for the product purchase lifecycle.
 *  "pending" is the default, publicly-visible state — there is no separate
 *  "active" state. Sellers may move between draft and pending on edit.
 *  "accepeted" is only ever reached via PUT /bit/accept/:id. */
const STATUS_TRANSITIONS = {
  draft: ["pending"],
  pending: ["draft", "rejected", "accepeted"],
  rejected: ["draft", "pending"],
  accepeted: ["booking", "purchased", "sold"],
  booking: ["purchased"],
  purchased: ["sold"],
  sold: [],
};

const TERMINAL_STATUSES = ["sold", "rejected"];
const NON_EDITABLE_STATUSES = ["sold"];

// ─── IMAGE UPLOAD SETUP ───────────────────────────────────────────────────────
const uploadRoot = path.join(__dirname, "..", "uploads");
const buySellUploadDir = path.join(uploadRoot, "buysell");

if (!fs.existsSync(buySellUploadDir)) {
  fs.mkdirSync(buySellUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, buySellUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const base = path.basename(file.originalname || "file", ext);
    const safeBase = base.replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${safeBase}_${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

// ─── EXCEL BULK-UPLOAD SETUP (separate from image upload above) ──────────────
// Memory storage - the excel file is parsed in-memory, never written to the
// buysell image folder.
const bulkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

function buildImageUrl(filename) {
  return `/uploads/buysell/${filename}`;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function toObjectId(value) {
  if (!value || value === "") return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  const str = extractRefId(value);
  // Strict 24-hex check — avoids mongoose isValid("101") false positives
  if (/^[a-fA-F0-9]{24}$/.test(str)) {
    return new mongoose.Types.ObjectId(str);
  }
  return null;
}

function extractRefId(value) {
  if (value == null || value === "") return "";
  if (typeof value === "object") {
    if (typeof value.toHexString === "function") return value.toHexString();
    if (value._id) return extractRefId(value._id);
    if (value.$oid) return String(value.$oid);
    if (value.id && typeof value.id !== "object") return String(value.id);
  }
  const str = String(value).trim();
  return str === "[object Object]" ? "" : str;
}

const SPEC_ID_ALIASES = {
  "6a7dae093bd76bf10c1e4a83": "6a41f4e20fd927b44f1a2254", // Brand
  "6a7dae0a3bd76bf10c1e4a8a": "6a41f4e30fd927b44f1a2255", // Model
  "6a7dae0a3bd76bf10c1e4a8d": "6a32447946ebddbeb905e6f2", // Fuel Type
  "6a87dc5e7f4e721373aa5ab4": "6a32441146ebddbeb905e6c4", // Make Year
  "6a87dc5e7f4e721373aa5ab6": "6a32444546ebddbeb905e6db", // KM Driven
  "6a87dc5e7f4e721373aa5ab8": "6a32457a46ebddbeb905e8b9", // No. of Owners
};
const OFFICIAL_FUEL_SPEC_ID = "6a32447946ebddbeb905e6f2";
const KNOWN_FUEL_NAMES = new Set([
  "diesel",
  "petrol",
  "cng",
  "lpg",
  "electric",
  "hybrid",
  "not applicable",
  "gasoline",
  "gas",
]);

/**
 * Resolve LocationCountry/State/City input (mongo _id, uuid `id`, or numeric externalId)
 * to a Mongo ObjectId suitable for BuySellProduct refs.
 */
async function resolveLocationMongoId(Model, raw) {
  if (raw == null || raw === "") return null;
  if (raw instanceof mongoose.Types.ObjectId) return raw;

  const str = String(raw).trim();
  if (!str) return null;

  if (/^[a-fA-F0-9]{24}$/.test(str)) {
    const byMongo = await Model.findById(str).select("_id").lean();
    if (byMongo?._id) return byMongo._id;
  }

  const byUuid = await Model.findOne({
    $or: [{ id: str }, { uuid: str }],
  })
    .select("_id")
    .lean();
  if (byUuid?._id) return byUuid._id;

  if (/^\d+$/.test(str)) {
    const byExt = await Model.findOne({ externalId: Number(str) })
      .select("_id")
      .lean();
    if (byExt?._id) return byExt._id;
  }

  return null;
}

async function resolveDefaultIndiaCountryId() {
  const india = await LocationCountry.findOne({
    name: { $regex: /^india$/i },
  })
    .select("_id")
    .lean();
  return india?._id || null;
}

function getActor(req) {
  const user = req.user || {};
  const roleId = user.roleId;
  const roleNameFromRef =
    roleId && typeof roleId === "object" ? roleId.name || roleId.status : null;

  return {
    id: user._id || user.id || null,
    mongoId: user._id ? String(user._id) : null,
    customId: user.id ? String(user.id) : null,
    name: user.name || "unknown",
    email: user.email || "unknown",
    mobile: user.mobile || "unknown",
    role: user.role || roleNameFromRef || "unknown",
    roleId: roleId || null,
  };
}

/** Collect every id form for the logged-in user (Mongo _id and custom uuid). */
function collectActorUserIds(actor) {
  const ids = new Set();
  const add = (value) => {
    if (value == null || value === "") return;
    ids.add(String(value));
  };
  if (!actor) return ids;
  add(actor.id);
  add(actor.mongoId);
  add(actor.customId);
  return ids;
}

/** True when `storedUserId` refers to the same user as `actor` (either id shape). */
function isSameUserAsActor(storedUserId, actor) {
  if (!storedUserId || !actor) return false;
  const stored = String(storedUserId).toLowerCase();
  for (const id of collectActorUserIds(actor)) {
    if (String(id).toLowerCase() === stored) return true;
  }
  return false;
}

function canManageBuySellProduct(product, actor) {
  return isAdminActor(actor) || isSameUserAsActor(product?.userid, actor);
}

/** Resolve the logged-in user's MongoDB _id for ownership checks. */
function getActorMongoId(req) {
  const user = req.user || {};
  const fromUnderscoreId = toObjectId(user._id);
  if (fromUnderscoreId) return fromUnderscoreId;

  const actor = getActor(req);
  const fromActorId = toObjectId(actor.id);
  if (fromActorId) return fromActorId;

  return null;
}

/** Normalise any incoming status value to a valid lowercase enum member.
 *  Falls back to `fallback` (default "pending") if unrecognised.
 *  Legacy "active" listings are treated as "pending". */
function normaliseStatus(raw, fallback = "pending") {
  if (!raw) return fallback;
  const lower = String(raw).toLowerCase().trim();
  if (lower === "active") return "pending";
  return VALID_STATUSES.includes(lower) ? lower : fallback;
}

function canonicalStatus(raw) {
  return normaliseStatus(raw, null) || String(raw || "").toLowerCase().trim();
}

function isAdminActor(actor) {
  if (!actor) return false;
  const email = actor.email && String(actor.email).toLowerCase();
  if (email === "admin@mail.com") return true;
  const role = actor.roleId || actor.role;
  const roleName =
    typeof role === "string" ? role : role?.name || role?.status || "";
  const n = String(roleName).toLowerCase();
  return (
    n === "admin" ||
    n === "super admin" ||
    n === "super_admin" ||
    n === "superadmin"
  );
}

function isValidTransition(fromStatus, toStatus) {
  const from = canonicalStatus(fromStatus);
  const to = canonicalStatus(toStatus);
  if (!from || !to || from === to) return true;
  const allowed = STATUS_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

function assertStatusTransition(fromStatus, toStatus) {
  const from = canonicalStatus(fromStatus);
  const to = canonicalStatus(toStatus);
  if (from === to) return;
  if (!isValidTransition(from, to)) {
    const err = new Error(
      `Cannot change status from "${fromStatus}" to "${toStatus}".`,
    );
    err.statusCode = 400;
    throw err;
  }
}

function isOwnerDraftPendingSwitch(fromStatus, toStatus) {
  const from = canonicalStatus(fromStatus);
  const to = canonicalStatus(toStatus);
  const editable = ["draft", "pending", "rejected"];
  return editable.includes(from) && (to === "draft" || to === "pending");
}

// ─── CREATE-STATUS RESOLUTION ─────────────────────────────────────────────────
// Only "draft" or "pending" are ever assigned at creation time — "active" is
// never set here. Non-admins always land on "pending"; admins may explicitly
// choose "draft", otherwise they also fall back to "pending".
function resolveCreateStatus(raw, isAdmin) {
  const normalized = normaliseStatus(raw, "pending");
  if (normalized === "draft") return "draft";
  if (isAdmin) {
    const allowed = ["draft", "pending"];
    return allowed.includes(normalized) ? normalized : "pending";
  }
  // Regular users always land in pending — awaiting admin approval.
  return "pending";
}

function computeAdvanceAmount(product, requestedAmount) {
  const price = Number(product?.price) || 0;
  const requested = Number(requestedAmount);
  if (Number.isFinite(requested) && requested > 0) return requested;
  return Math.max(1, Math.round(price * 0.1));
}

function computeRemainingAmount(product) {
  const price = Number(product?.price) || 0;
  const advance = Number(product?.advanceAmount) || 0;
  return Math.max(1, price - advance);
}

let _razorpay = null;
function getRazorpay() {
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_T2J2vGFVIw0xpl",
      key_secret: process.env.RAZORPAY_KEY_SECRET || "OO8ZuWKdDAdJ2mS8OJMpukAb",
    });
  }
  return _razorpay;
}

async function removeProductFromAllCarts(productId) {
  await BuySellCart.deleteMany({ productId });
}

function assertProductEditable(product, actor) {
  if (!product) {
    const err = new Error("Product not found.");
    err.statusCode = 404;
    throw err;
  }
  if (NON_EDITABLE_STATUSES.includes(product.status)) {
    const err = new Error("Product is already sold.");
    err.statusCode = 400;
    throw err;
  }
  if (
    ["booking", "purchased"].includes(product.status) &&
    !isAdminActor(actor)
  ) {
    const err = new Error("Product cannot be edited in its current status.");
    err.statusCode = 400;
    throw err;
  }
}

function assertProductAvailableForBooking(product) {
  if (!product) {
    const err = new Error("Product not found.");
    err.statusCode = 404;
    throw err;
  }
  if (product.status === "sold") {
    const err = new Error("Product is already sold.");
    err.statusCode = 400;
    throw err;
  }
  if (product.status === "purchased") {
    const err = new Error("Product has already been purchased.");
    err.statusCode = 400;
    throw err;
  }
  if (product.status === "booking") {
    const err = new Error("Product is currently booked.");
    err.statusCode = 400;
    throw err;
  }
  // pending (default listing) or accepeted (offer accepted) can be booked
  if (!["pending", "accepeted"].includes(product.status)) {
    const err = new Error("Product is not available for purchase.");
    err.statusCode = 400;
    throw err;
  }
}

function assertProductAvailableForPurchase(product, actor) {
  if (!product) {
    const err = new Error("Product not found.");
    err.statusCode = 404;
    throw err;
  }
  if (product.status === "sold") {
    const err = new Error("Product is already sold.");
    err.statusCode = 400;
    throw err;
  }
  if (product.status === "purchased") {
    const err = new Error("Product has already been purchased.");
    err.statusCode = 400;
    throw err;
  }
  if (product.status !== "booking") {
    const err = new Error("Product is not available for purchase.");
    err.statusCode = 400;
    throw err;
  }
  if (
    product.bookedBy &&
    actor &&
    !isSameUserAsActor(product.bookedBy, actor)
  ) {
    const err = new Error("Booking already exists.");
    err.statusCode = 403;
    throw err;
  }
}

function assertProductAvailableForSold(product) {
  if (!product) {
    const err = new Error("Product not found.");
    err.statusCode = 404;
    throw err;
  }
  if (product.status === "sold") {
    const err = new Error("Product is already sold.");
    err.statusCode = 400;
    throw err;
  }
  if (product.status !== "purchased") {
    const err = new Error("Invalid product status.");
    err.statusCode = 400;
    throw err;
  }
}

function sendRouteError(res, error, fallbackMessage) {
  // Log full error for server-side debugging
  try {
    console.error(
      "[buysell route error]",
      error && error.stack ? error.stack : error,
    );
  } catch (e) {
    // ignore logging errors
  }
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: error.message || fallbackMessage,
    error: error.message || fallbackMessage,
  });
}

// ─── USER MOBILE LOOKUP HELPERS ────────────────────────────────────────────────
// Products/bit-records store `userid` which may be either a Mongo ObjectId
// string or a custom UUID (matches the dual id/_id pattern used elsewhere in
// this codebase), so we match against both fields.

/** Single lookup - used by buildEnrichedResponse (seller mobile on view/add/edit). */
async function getUserMobile(userId) {
  if (!userId) return null;
  const idStr = String(userId);
  const orConditions = [{ id: idStr }];
  if (mongoose.Types.ObjectId.isValid(idStr)) {
    orConditions.push({ _id: new mongoose.Types.ObjectId(idStr) });
  }
  const user = await User.findOne({ $or: orConditions })
    .select("mobile")
    .lean();
  return user?.mobile || null;
}

/** Batch lookup — sellers/buyers. Map keyed by both `_id` and custom `id`. */
async function getUsersContactMap(userIds) {
  const uniqueIds = [...new Set((userIds || []).filter(Boolean).map(String))];
  if (!uniqueIds.length) return {};

  const objectIds = uniqueIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const users = await User.find({
    $or: [{ id: { $in: uniqueIds } }, { _id: { $in: objectIds } }],
  })
    .select("_id id mobile name")
    .lean();

  const map = {};
  users.forEach((u) => {
    const contact = {
      mobile: u.mobile || null,
      name: (u.name && String(u.name).trim()) || null,
    };
    if (u._id) map[String(u._id)] = contact;
    if (u.id) map[String(u.id)] = contact;
  });
  return map;
}

/** Backward-compatible mobile-only map. */
async function getUsersMobileMap(userIds) {
  const contactMap = await getUsersContactMap(userIds);
  const mobileMap = {};
  Object.entries(contactMap).forEach(([id, contact]) => {
    mobileMap[id] = contact?.mobile || null;
  });
  return mobileMap;
}

function bitRecordUserId(record) {
  return record?.userId || record?.userid || null;
}

function isPlaceholderPersonName(value) {
  if (!value || typeof value !== "string") return true;
  const n = value.trim().toLowerCase();
  return (
    !n ||
    n === "buyer" ||
    n === "seller" ||
    n === "unknown" ||
    n === "admin" ||
    n === "user"
  );
}

function resolvePersonName(...candidates) {
  for (const c of candidates) {
    if (!isPlaceholderPersonName(c)) return String(c).trim();
  }
  return null;
}

function contactFromMap(contactMap, userId) {
  if (!userId) return { mobile: null, name: null };
  return contactMap[String(userId)] || { mobile: null, name: null };
}

function enrichBitRecordForResponse(record, contactMap) {
  const buyerId = bitRecordUserId(record);
  const contact = contactFromMap(contactMap, buyerId);
  const buyerName =
    resolvePersonName(contact.name, record.userName, record.buyer_name) ||
    "Buyer";
  return {
    ...record,
    userId: buyerId,
    userName: buyerName,
    buyer_name: buyerName,
    buyer_mobile: contact.mobile || record.buyer_mobile || null,
    status: record.status || "pending",
  };
}

/**
 * Self-heal old rows that predate the YYMMDD#### vehicleId format.
 * If resolveVehicleId() can't produce a usable id (both vehicleId and
 * bsNumber are empty/old), generate one now and persist it, so it's fixed
 * in the DB permanently instead of just patched in the response.
 */
async function ensureVehicleId(doc) {
  if (!doc || !doc._id) return doc;
  if (resolveVehicleId(doc)) return doc; // already has a usable id
  try {
    const newId = await generateNextVehicleId(doc.createdAt);
    await BuySellProduct.updateOne(
      { _id: doc._id },
      { $set: { vehicleId: newId } },
    );
    doc.vehicleId = newId;
  } catch (err) {
    console.warn(
      `[buy-sell] failed to backfill vehicleId for ${doc._id}:`,
      err.message,
    );
  }
  return doc;
}

async function ensureVehicleIds(docs) {
  if (!Array.isArray(docs) || docs.length === 0) return docs;
  await Promise.all(docs.map((doc) => ensureVehicleId(doc)));
  return docs;
}

function enrichProductListItem(
  item,
  contactMap,
  favoriteSet,
  bitRecords,
  bidSummary,
) {
  const sellerContact = contactFromMap(contactMap, item.userid);
  const sellerName =
    resolvePersonName(sellerContact.name, item.sellerName, item.created_by) ||
    "Seller";
  const records = Array.isArray(bitRecords) ? bitRecords : [];
  const bid_count =
    bidSummary && typeof bidSummary.bid_count === "number"
      ? bidSummary.bid_count
      : records.length;
  const highest_bid =
    bidSummary && "highest_bid" in bidSummary
      ? bidSummary.highest_bid
      : records.length
        ? records.reduce(
            (max, r) => (Number(r.bit) > max ? Number(r.bit) : max),
            0,
          )
        : null;
  const accepted_bid = records.find((r) => r.status === "accepeted") || null;

  return {
    ...item,
    images: Array.isArray(item.images) ? item.images : [], // ← ADDED
    bsNumber: formatBsNumberWithDate(item.bsNumber, item.createdAt) || null,
    vehicleId: resolveVehicleId(item),
    seller_mobile: sellerContact.mobile || null,
    sellerName,
    created_by: sellerName,
    is_favorite: favoriteSet.has(String(item._id)),
    bit_records: records,
    bid_count,
    highest_bid,
    accepted_bid,
    featured: item.featured || null,
    isFeatured: isLiveFeaturedPlacement(item.featured),
  };
}

/** Full field set — kept in parity with getById so the list response is
 *  self-sufficient and the frontend never needs a follow-up detail call. */
const LIST_PRODUCT_SELECT =
  "id bsNumber vehicleId category_id subcategory_id userid price description images specifications country_id state_id city_id address pincode user_type status viewCount created_by updated_by createdAt updatedAt __v bookedBy bookedAt advanceAmount purchasedBy purchasedAt purchaseAmount soldAt";

/** Same field set for paginated browse — kept identical to LIST_PRODUCT_SELECT
 *  on purpose; see enrichBuySellListItems' `lite` option for the actual
 *  perf/latency lever (skips bid + user lookups, not fields). */
const LIST_PRODUCT_SELECT_LITE = LIST_PRODUCT_SELECT;

/** Optional page/limit — omit both to keep legacy full-list behavior. */
function parseListPagination(body = {}) {
  if (body.page === undefined && body.limit === undefined) return null;
  const page = Math.max(1, parseInt(String(body.page ?? "1"), 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(String(body.limit ?? "12"), 10) || 12),
  );
  return { page, limit, skip: (page - 1) * limit };
}

function parseListSort(sort) {
  switch (String(sort || "newest").toLowerCase()) {
    case "price_asc":
      return { price: 1 };
    case "price_desc":
      return { price: -1 };
    case "views":
      return { viewCount: -1, createdAt: -1 };
    case "newest":
    default:
      return { createdAt: -1 };
  }
}

/** Text matches description / address / bsNumber / pincode (same as portal client filter). */
function applyListSearchFilter(filter, search) {
  const q = String(search ?? "").trim();
  if (!q) return;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "i");
  filter.$and = [
    ...(filter.$and || []),
    {
      $or: [
        { description: regex },
        { address: regex },
        { bsNumber: regex },
        { vehicleId: regex },
        { pincode: regex },
      ],
    },
  ];
}

function applyListStatusFilter(filter, status, statuses) {
  if (Array.isArray(statuses) && statuses.length > 0) {
    const normalised = statuses
      .map((s) => normaliseStatus(s, null))
      .filter(Boolean);
    if (normalised.length === 1) filter.status = normalised[0];
    else if (normalised.length > 1) filter.status = { $in: normalised };
    return;
  }
  if (status) {
    const normalised = normaliseStatus(status, null);
    if (normalised) filter.status = normalised;
  }
}

/** Bid counts/max without shipping every offer document on list APIs. */
async function getBidSummaryByProductIds(productIds) {
  const map = {};
  if (!productIds.length) return map;
  const rows = await ProductBitRecord.aggregate([
    { $match: { productId: { $in: productIds } } },
    {
      $group: {
        _id: "$productId",
        bid_count: { $sum: 1 },
        highest_bid: { $max: "$bit" },
      },
    },
  ]);
  rows.forEach((row) => {
    map[String(row._id)] = {
      bid_count: row.bid_count || 0,
      highest_bid: row.highest_bid ?? null,
    };
  });
  return map;
}

// ─── SHARED ENRICHMENT HELPER ──────────────────────────────────────────────────
async function buildEnrichedResponse(data) {
  // Backfill any old row missing a proper YYMMDD#### vehicleId before
  // building the response.
  await ensureVehicleId(data);

  const [countryDoc, stateDoc, cityDoc, sellerContactMap, featuredDoc] =
    await Promise.all([
      data.country_id
        ? LocationCountry.findById(data.country_id)
            .select("name sortname")
            .lean()
        : null,
      data.state_id
        ? LocationState.findById(data.state_id).select("name").lean()
        : null,
      data.city_id
        ? LocationCity.findById(data.city_id).select("name").lean()
        : null,
      getUsersContactMap([data.userid].filter(Boolean)),
      BuySellFeaturedVehicle.findOne({ productId: data._id })
        .sort({ createdAt: -1 })
        .lean(),
    ]);
  const sellerContact = contactFromMap(sellerContactMap, data.userid);
  const sellerMobile = sellerContact.mobile;
  const sellerName =
    resolvePersonName(sellerContact.name, data.sellerName, data.created_by) ||
    "Seller";

  const enrichedSpecs = await Promise.all(
    (data.specifications || []).map(async (spec) => {
      const specInfo = spec.specification_id
        ? await Specification.findOne({
            $or: [
              ...(/^[a-fA-F0-9]{24}$/.test(String(spec.specification_id))
                ? [{ _id: spec.specification_id }]
                : []),
              { id: String(spec.specification_id) },
            ],
          })
            .select("specification_name type is_required")
            .lean()
        : null;

      let specValueInfo = null;
      const rawValue = String(spec.specification_value || "").trim();
      if (rawValue) {
        let valDoc = null;
        if (/^[a-fA-F0-9]{24}$/.test(rawValue)) {
          valDoc = await SpecificationValue.findById(rawValue)
            .select("specification_value_name")
            .lean();
        }
        if (!valDoc) {
          valDoc = await SpecificationValue.findOne({
            specification_value_name: { $regex: `^${rawValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
          })
            .select("specification_value_name")
            .lean();
        }
        if (valDoc) {
          specValueInfo = {
            specification_value_name: valDoc.specification_value_name,
          };
        }
      }

      return {
        specification_id: spec.specification_id,
        specification_value: spec.specification_value,
        specification_info: specInfo
          ? {
              specification_name: specInfo.specification_name,
              type: specInfo.type,
              is_required: specInfo.is_required,
            }
          : null,
        specification_value_info: specValueInfo,
      };
    }),
  );

  return {
    _id: data._id,
    bsNumber: formatBsNumberWithDate(data.bsNumber, data.createdAt) || null,
    vehicleId: resolveVehicleId(data),
    category_id: data.category_id || null,
    subcategory_id: data.subcategory_id || null,
    userid: data.userid || null,
    seller_mobile: sellerMobile || null,
    sellerName,
    price: data.price,
    description: data.description || "",
    images: data.images || [],
    country_id: data.country_id ? String(data.country_id) : "",
    state_id: data.state_id ? String(data.state_id) : "",
    city_id: data.city_id ? String(data.city_id) : "",
    country_info: countryDoc
      ? { _id: countryDoc._id, name: countryDoc.name }
      : {},
    state_info: stateDoc ? { _id: stateDoc._id, name: stateDoc.name } : {},
    city_info: cityDoc ? { _id: cityDoc._id, name: cityDoc.name } : {},
    address: data.address || "",
    pincode: data.pincode || "",
    specifications: enrichedSpecs,
    listing_highlights: buildListingHighlights(enrichedSpecs),
    status: data.status,
    bookedBy: data.bookedBy || null,
    bookedAt: data.bookedAt || null,
    advanceAmount: data.advanceAmount ?? null,
    purchasedBy: data.purchasedBy || null,
    purchasedAt: data.purchasedAt || null,
    purchaseAmount: data.purchaseAmount ?? null,
    soldAt: data.soldAt || null,
    created_by: sellerName,
    updated_by: data.updated_by || null,
    id: data.id,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    __v: data.__v,
    ...(featuredDoc
      ? (() => {
          const featured = buildFeaturedPublicMeta(featuredDoc);
          return {
            featured,
            isFeatured: isLiveFeaturedPlacement(featured),
          };
        })()
      : { featured: null, isFeatured: false }),
  };
}

/** Statuses excluded from public seller product listings. */
const SELLER_PRODUCTS_EXCLUDED_STATUSES = [
  "sold",
  "purchased",
  "rejected",
  "draft",
];

/** Resolve a user by either custom id or Mongo _id. */
async function findUserByEitherId(userId) {
  if (!userId) return null;
  const idStr = String(userId);
  const orConditions = [{ id: idStr }];
  if (mongoose.Types.ObjectId.isValid(idStr)) {
    orConditions.push({ _id: new mongoose.Types.ObjectId(idStr) });
  }
  return User.findOne({ $or: orConditions })
    .select("_id id name profileImage mobile")
    .lean();
}

async function findOwnerReference(ownerId) {
  const user = await findUserByEitherId(ownerId);
  if (user) return user;

  const mongoId = toObjectId(ownerId);
  if (!mongoId) return null;

  const hasProducts = await BuySellProduct.exists({ userid: mongoId });
  return hasProducts ? { _id: mongoId, id: null } : null;
}

async function resolveActorMongoId(actor) {
  const directId = toObjectId(actor?.mongoId) || toObjectId(actor?.id);
  if (directId) return directId;

  const user = await findUserByEitherId(actor?.id);
  return user?._id || null;
}

/**
 * Build a BuySellProduct filter for `userid`, which may be stored as either a
 * Mongo ObjectId or a custom user uuid string (see create handler: userid: actor.id).
 * Mixing both shapes in a single `$in` array causes ObjectId cast errors.
 */
function buildBuySellUseridFilter(ownerUser) {
  if (!ownerUser) return null;

  const conditions = [];
  const mongoId = ownerUser._id;
  const customId = ownerUser.id ? String(ownerUser.id) : null;
  const mongoIdStr = mongoId ? String(mongoId) : null;

  if (mongoId) {
    conditions.push({ userid: mongoId });
  }

  if (customId) {
    conditions.push({
      $expr: { $eq: [{ $toString: "$userid" }, customId] },
    });
  }

  if (mongoIdStr && mongoIdStr !== customId) {
    conditions.push({
      $expr: { $eq: [{ $toString: "$userid" }, mongoIdStr] },
    });
  }

  if (conditions.length === 0) return null;
  if (conditions.length === 1) return conditions[0];
  return { $or: conditions };
}

/** Actor-shaped wrapper — listings store userid as either Mongo _id or custom uuid. */
function buildBuySellUseridFilterFromActor(actor) {
  if (!actor) return null;
  const mongoId = actor.mongoId ? toObjectId(actor.mongoId) : null;
  return buildBuySellUseridFilter({
    _id: mongoId || actor.mongoId || null,
    id: actor.customId || null,
  });
}

/** Batch-enrich buy/sell list items with country/state/city info. */
async function enrichBuySellProductsWithLocation(items) {
  if (!Array.isArray(items) || items.length === 0) return items;

  const toIdStr = (id) => (id ? String(id) : null);
  const countryIds = [
    ...new Set(items.map((i) => toIdStr(i.country_id)).filter(Boolean)),
  ];
  const stateIds = [
    ...new Set(items.map((i) => toIdStr(i.state_id)).filter(Boolean)),
  ];
  const cityIds = [
    ...new Set(items.map((i) => toIdStr(i.city_id)).filter(Boolean)),
  ];

  const objectIdList = (ids) =>
    ids
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

  const [countries, states, cities] = await Promise.all([
    countryIds.length
      ? LocationCountry.find({ _id: { $in: objectIdList(countryIds) } })
          .select("name sortname")
          .lean()
      : [],
    stateIds.length
      ? LocationState.find({ _id: { $in: objectIdList(stateIds) } })
          .select("name")
          .lean()
      : [],
    cityIds.length
      ? LocationCity.find({ _id: { $in: objectIdList(cityIds) } })
          .select("name")
          .lean()
      : [],
  ]);

  const countryMap = {};
  countries.forEach((c) => {
    countryMap[String(c._id)] = { _id: c._id, name: c.name };
  });
  const stateMap = {};
  states.forEach((s) => {
    stateMap[String(s._id)] = { _id: s._id, name: s.name };
  });
  const cityMap = {};
  cities.forEach((c) => {
    cityMap[String(c._id)] = { _id: c._id, name: c.name };
  });

  return items.map((item) => ({
    ...item,
    country_info: countryMap[toIdStr(item.country_id)] || {},
    state_info: stateMap[toIdStr(item.state_id)] || {},
    city_info: cityMap[toIdStr(item.city_id)] || {},
  }));
}

async function enrichBuySellSpecifications(items) {
  if (!Array.isArray(items) || items.length === 0) return items;

  const specIds = new Set();
  const valueIds = new Set();

  items.forEach((item) => {
    (item.specifications || []).forEach((spec) => {
      const specId = extractRefId(spec?.specification_id);
      if (specId) {
        specIds.add(specId);
        const alias = SPEC_ID_ALIASES[specId];
        if (alias) specIds.add(alias);
      }
      const rawValue = extractRefId(spec?.specification_value);
      if (rawValue && /^[a-fA-F0-9]{24}$/.test(rawValue)) {
        valueIds.add(rawValue);
      }
    });
  });
  specIds.add(OFFICIAL_FUEL_SPEC_ID);
  specIds.add("6a7dae0a3bd76bf10c1e4a8d");

  const specMongoIds = [...specIds]
    .filter((id) => /^[a-fA-F0-9]{24}$/.test(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  const specAltIds = [...specIds].filter((id) => !/^[a-fA-F0-9]{24}$/.test(id));

  const specQuery = [];
  if (specMongoIds.length) specQuery.push({ _id: { $in: specMongoIds } });
  if (specAltIds.length) specQuery.push({ id: { $in: specAltIds } });

  const valueMongoIds = [...valueIds]
    .filter((id) => /^[a-fA-F0-9]{24}$/.test(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  const valueNames = [];
  items.forEach((item) => {
    (item.specifications || []).forEach((spec) => {
      const raw = extractRefId(spec?.specification_value) || String(spec?.specification_value || "").trim();
      if (raw && !/^[a-fA-F0-9]{24}$/.test(raw)) valueNames.push(raw);
    });
  });

  const valueQuery = [];
  if (valueMongoIds.length) {
    valueQuery.push({ _id: { $in: valueMongoIds } });
    valueQuery.push({ id: { $in: [...valueIds] } });
  }
  if (valueNames.length) {
    valueQuery.push({
      specification_value_name: { $in: [...new Set(valueNames)] },
    });
  }
  const fuelSpecOids = [OFFICIAL_FUEL_SPEC_ID, "6a7dae0a3bd76bf10c1e4a8d"]
    .filter((id) => /^[a-fA-F0-9]{24}$/.test(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  if (fuelSpecOids.length) {
    valueQuery.push({ specification_id: { $in: fuelSpecOids } });
  }

  const [specDocs, valueDocs] = await Promise.all([
    specQuery.length
      ? Specification.find(specQuery.length === 1 ? specQuery[0] : { $or: specQuery })
          .select("specification_name type is_required")
          .lean()
      : [],
    valueQuery.length
      ? SpecificationValue.find({ $or: valueQuery })
          .select("specification_value_name specification_id id")
          .lean()
      : [],
  ]);

  const specMap = {};
  specDocs.forEach((doc) => {
    if (doc?._id) specMap[String(doc._id)] = doc;
    if (doc?.id) specMap[String(doc.id)] = doc;
  });
  Object.entries(SPEC_ID_ALIASES).forEach(([from, to]) => {
    if (specMap[to] && !specMap[from]) specMap[from] = specMap[to];
  });

  const extraParentIds = [];
  valueDocs.forEach((doc) => {
    const parentId = extractRefId(doc?.specification_id);
    if (parentId && !specMap[parentId]) extraParentIds.push(parentId);
  });
  if (extraParentIds.length) {
    const extraSpecs = await Specification.find({
      $or: [
        {
          _id: {
            $in: extraParentIds
              .filter((id) => /^[a-fA-F0-9]{24}$/.test(id))
              .map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
        { id: { $in: extraParentIds } },
      ],
    })
      .select("specification_name type is_required")
      .lean();
    extraSpecs.forEach((doc) => {
      if (doc?._id) specMap[String(doc._id)] = doc;
      if (doc?.id) specMap[String(doc.id)] = doc;
    });
  }

  const valueMap = {};
  valueDocs.forEach((doc) => {
    if (doc?._id) valueMap[String(doc._id)] = doc;
    if (doc?.id) valueMap[String(doc.id)] = doc;
    const name = String(doc?.specification_value_name || "").trim();
    if (name) valueMap[name.toLowerCase()] = doc;
  });

  return items.map((item) => {
    const specifications = (item.specifications || []).map((spec) => {
      const specId = extractRefId(spec?.specification_id);
      const specValueRaw =
        extractRefId(spec?.specification_value) ||
        String(spec?.specification_value || "").trim();
      const valueDoc =
        valueMap[specValueRaw] ||
        valueMap[specValueRaw.toLowerCase()] ||
        null;
      let specInfoDoc =
        specMap[specId] ||
        specMap[SPEC_ID_ALIASES[specId]] ||
        null;
      if (!specInfoDoc && valueDoc?.specification_id) {
        const parentId = extractRefId(valueDoc.specification_id);
        specInfoDoc =
          specMap[parentId] || specMap[SPEC_ID_ALIASES[parentId]] || null;
      }
      if (
        !specInfoDoc &&
        (specId === OFFICIAL_FUEL_SPEC_ID ||
          SPEC_ID_ALIASES[specId] === OFFICIAL_FUEL_SPEC_ID)
      ) {
        specInfoDoc = specMap[OFFICIAL_FUEL_SPEC_ID] || {
          specification_name: "Fuel Type",
          type: "selectable",
          is_required: "Yes",
        };
      }
      const valueName = valueDoc?.specification_value_name || null;

      return {
        specification_id: spec?.specification_id,
        specification_value: spec?.specification_value,
        specification_info: specInfoDoc
          ? {
              specification_name: specInfoDoc.specification_name,
              type: specInfoDoc.type,
              is_required: specInfoDoc.is_required,
            }
          : null,
        specification_value_info: valueName
          ? { specification_value_name: valueName }
          : null,
      };
    });

    return {
      ...item,
      specifications,
      listing_highlights: buildListingHighlights(specifications),
    };
  });
}

function specNameKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function highlightValue(spec) {
  const named = spec?.specification_value_info?.specification_value_name;
  if (named) return String(named).trim();
  const raw = String(spec?.specification_value || "").trim();
  if (!raw || /^[a-fA-F0-9]{24}$/.test(raw)) return "";
  return raw;
}

function buildListingHighlights(specifications) {
  const highlights = {
    makeYear: null,
    mileage: null,
    fuelType: null,
    owners: null,
    brand: null,
  };
  (specifications || []).forEach((spec) => {
    const name = specNameKey(spec?.specification_info?.specification_name);
    const value = highlightValue(spec);
    if (!value) return;
    if (KNOWN_FUEL_NAMES.has(value.toLowerCase())) highlights.fuelType = value;
    if (!name) return;
    if (name === "brand" || name === "make") highlights.brand = value;
    if (name.includes("year")) highlights.makeYear = value;
    if (name.includes("fuel")) highlights.fuelType = value;
    if (name.includes("owner")) highlights.owners = value;
    if (
      name.includes("km") ||
      name.includes("driven") ||
      name.includes("mileage") ||
      name.includes("odometer")
    ) {
      highlights.mileage = value;
    }
  });
  return highlights;
}

/** Shared list enrichment: favorites, seller mobile/name, and bid summary. */
async function enrichBuySellListItems(items, actor, options = {}) {
  if (!Array.isArray(items) || items.length === 0) return [];

  // Backfill any old rows missing a proper YYMMDD#### vehicleId before
  // building the response.
  await ensureVehicleIds(items);

  const includeBitRecords = options.includeBitRecords === true;
  /** Marketplace cards: skip bids + user lookups (biggest list latency). */
  const lite = options.lite === true;
  const allProductIds = items.map((item) => item._id);

  const favoritePromise = actor?.id
    ? Favorite.find({
        entity: "buySell",
        entityId: { $in: allProductIds },
        userId: String(actor.id),
      })
        .select("entityId")
        .lean()
    : Promise.resolve([]);

  const featuredPromise = BuySellFeaturedVehicle.find({
    productId: { $in: allProductIds },
  })
    .sort({ createdAt: -1 })
    .lean();

  const [userFavorites, featuredResult] = await Promise.all([
    favoritePromise,
    featuredPromise,
  ]);

  const featuredMetaByProductId = new Map();
  if (featuredResult && featuredResult.length > 0) {
    const byProduct = new Map();
    for (const placement of featuredResult) {
      const key = String(placement.productId);
      if (!byProduct.has(key)) byProduct.set(key, []);
      byProduct.get(key).push(placement);
    }
    for (const [productId, placements] of byProduct.entries()) {
      const preferred = pickPreferredFeaturedPlacement(placements);
      if (preferred) {
        featuredMetaByProductId.set(
          productId,
          buildFeaturedPublicMeta(preferred),
        );
      }
    }
  }

  if (lite) {
    // Still cheap (single aggregate) — was previously hardcoded to 0/null,
    // which made list bid counts wrong whenever pagination kicked in.
    const bidSummary = await getBidSummaryByProductIds(allProductIds);
    const favoriteSet = new Set(
      userFavorites.map((fav) => String(fav.entityId)),
    );
    const emptyContact = {};
    return items.map((item) => {
      const featured = featuredMetaByProductId
        ? featuredMetaByProductId.get(String(item._id))
        : null;
      if (featured) item.featured = featured;
      return enrichProductListItem(
        item,
        emptyContact,
        favoriteSet,
        [],
        bidSummary[String(item._id)] || { bid_count: 0, highest_bid: null },
      );
    });
  }

  const bidsPromise = includeBitRecords
    ? ProductBitRecord.find({ productId: { $in: allProductIds } })
        .select("productId bit status userId userName createdAt")
        .sort({ createdAt: -1 })
        .lean()
    : getBidSummaryByProductIds(allProductIds);

  const bidsResult = await bidsPromise;

  const favoriteSet = new Set(userFavorites.map((fav) => String(fav.entityId)));

  let bitRecordsByProductId = {};
  let bidSummaryByProductId = {};

  if (includeBitRecords) {
    const allBitRecords = bidsResult;
    const sellerIds = items.map((item) => item.userid).filter(Boolean);
    const buyerIds = allBitRecords
      .map((r) => bitRecordUserId(r))
      .filter(Boolean);
    const contactMap = await getUsersContactMap([...sellerIds, ...buyerIds]);

    allBitRecords.forEach((record) => {
      const key = String(record.productId);
      if (!bitRecordsByProductId[key]) bitRecordsByProductId[key] = [];
      bitRecordsByProductId[key].push(
        enrichBitRecordForResponse(record, contactMap),
      );
    });

    return items.map((item) => {
      const productKey = String(item._id);
      const bitRecords = bitRecordsByProductId[productKey] || [];
      const featured = featuredMetaByProductId.get(productKey);
      if (featured) item.featured = featured;
      return enrichProductListItem(item, contactMap, favoriteSet, bitRecords);
    });
  }

  bidSummaryByProductId = bidsResult;
  const sellerIds = items.map((item) => item.userid).filter(Boolean);
  const contactMap = await getUsersContactMap(sellerIds);

  return items.map((item) => {
    const productKey = String(item._id);
    const featured = featuredMetaByProductId.get(productKey);
    if (featured) item.featured = featured;
    return enrichProductListItem(
      item,
      contactMap,
      favoriteSet,
      [],
      bidSummaryByProductId[productKey] || { bid_count: 0, highest_bid: null },
    );
  });
}

// ─── ACCEPT OFFER ───────────────────────────────────────────────────────────────
// Seller accepts a buyer's offer on their product. Marks the bit record accepted,
// rejects sibling (still-pending) offers on the same product, and auto-creates the
// income (seller)/expense (buyer) transactions.
//
// NOTE: status literal must match the ProductBitRecord schema enum spelling
// exactly — this codebase uses "accepeted" (not "accept"/"accepted").
buySellRouter.put("/bit/accept/:id", async (req, res) => {
  try {
    const actor = getActor(req);

    const resolvedBitId = await resolveToObjectId(
      ProductBitRecord,
      req.params.id,
    );
    if (!resolvedBitId)
      return res.status(404).json({ message: "Offer not found" });

    const bitRecord = await ProductBitRecord.findById(resolvedBitId).lean();
    if (!bitRecord) return res.status(404).json({ message: "Offer not found" });

    const product = await BuySellProduct.findById(bitRecord.productId).lean();
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (product.status === "sold") {
      return res.status(400).json({ message: "Product is already sold." });
    }
    // Bids can be accepted while the product is pending (default create
    // state) or booking.
    if (!["pending", "booking"].includes(product.status)) {
      return res.status(400).json({
        message: "Product is not available for offer acceptance.",
      });
    }
    if (bitRecord.status === "accepeted") {
      return res
        .status(400)
        .json({ message: "This offer is already accepted." });
    }
    if (bitRecord.status === "reject") {
      return res
        .status(400)
        .json({ message: "This offer was already rejected." });
    }

    // Only the seller (product owner) may accept an offer on their own product.
    if (product.userid && !isSameUserAsActor(product.userid, actor)) {
      return res
        .status(403)
        .json({ message: "Only the seller can accept this offer" });
    }

    const updatedBit = await ProductBitRecord.findByIdAndUpdate(
      resolvedBitId,
      { $set: { status: "accepeted" } },
      { new: true },
    ).lean();

    // Reject other pending offers on the same product — never more than one
    // accepted bid per product.
    await ProductBitRecord.updateMany(
      {
        productId: bitRecord.productId,
        _id: { $ne: resolvedBitId },
        status: { $nin: ["accepeted", "reject"] },
      },
      { $set: { status: "reject" } },
    );

    // Keep the product's own status in sync with the accepted bid.
    const updatedProduct = await BuySellProduct.findByIdAndUpdate(
      bitRecord.productId,
      { $set: { status: "accepeted", updated_by: actor.name } },
      { new: true },
    ).lean();

    let transactionResult = { skipped: true, reason: "not_attempted" };
    try {
      transactionResult = await createBuySellTransactions(
        updatedProduct || product,
        updatedBit,
      );
    } catch (txErr) {
      console.error(
        `[BuySell Offer Accept] createBuySellTransactions failed for bit ${resolvedBitId}:`,
        txErr.message,
      );
    }

    await Log.create({
      name: actor.name,
      email: actor.email,
      role: actor.role,
      action: `Accepted offer on ${entityName} (bit:${resolvedBitId}, product:${bitRecord.productId})`,
    });

    res.status(200).json({
      message: "Offer accepted successfully",
      bit_record: updatedBit,
      product_status: updatedProduct?.status || "accepeted",
      transaction: transactionResult,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error accepting offer", error: error.message });
  }
});

// ─── LIST ──────────────────────────────────────────────────────────────────────
buySellRouter.post("/list", async (req, res) => {
  try {
    const actor = getActor(req);
    const body = req.body || {};

    const {
      category_id,
      subcategory_id,
      status,
      statuses,
      country_id,
      state_id,
      city_id,
      userid,
      usear_type,
      min_price,
      max_price,
      search,
      q,
      sort,
      filters = [],
    } = body;

    const filter = {};

    // Ownership scope: sell = mine, buy = others, all/empty = everyone.
    // userid may be Mongo ObjectId or custom uuid — never compare with a single shape.
    const scope = String(usear_type || "").toLowerCase();
    if (scope === "sell" && actor.id) {
      const mine = buildBuySellUseridFilterFromActor(actor);
      if (mine) {
        filter.$and = [...(filter.$and || []), mine];
      }
    } else if (scope === "buy" && actor.id) {
      const mine = buildBuySellUseridFilterFromActor(actor);
      if (mine) {
        filter.$nor = [...(filter.$nor || []), mine];
      }
    }

    // Optional seller filter (admin list / tools).
    if (userid) {
      const sellerUser = await findUserByEitherId(String(userid));
      const sellerFilter = sellerUser
        ? buildBuySellUseridFilter(sellerUser)
        : buildBuySellUseridFilter({
            _id: toObjectId(userid),
            id: String(userid),
          });
      if (sellerFilter) {
        filter.$and = [...(filter.$and || []), sellerFilter];
      }
    }

    if (category_id) {
      const id = toObjectId(category_id);
      if (id) filter.category_id = id;
    }
    if (subcategory_id) {
      const id = toObjectId(subcategory_id);
      if (id) filter.subcategory_id = id;
    }
    if (country_id) {
      const id = toObjectId(country_id);
      if (id) filter.country_id = id;
    }
    if (state_id) {
      const id = toObjectId(state_id);
      if (id) filter.state_id = id;
    }
    if (city_id) {
      const id = toObjectId(city_id);
      if (id) filter.city_id = id;
    }

    applyListStatusFilter(filter, status, statuses);
    applyListSearchFilter(filter, search ?? q);

    if (min_price !== undefined || max_price !== undefined) {
      filter.price = {};
      if (min_price !== undefined && min_price !== "")
        filter.price.$gte = Number(min_price);
      if (max_price !== undefined && max_price !== "")
        filter.price.$lte = Number(max_price);
    }

    const requestedSpecIds = [];

    if (Array.isArray(filters) && filters.length > 0) {
      const specConditions = filters
        .filter((f) => f.specification_id)
        .map((f) => {
          const specId = toObjectId(f.specification_id);
          if (!specId) return null;
          requestedSpecIds.push(String(f.specification_id));
          const condition = { specification_id: specId };
          if (
            Array.isArray(f.specification_value) &&
            f.specification_value.length > 0
          ) {
            condition.specification_value = { $in: f.specification_value };
          } else if (
            typeof f.specification_value === "string" &&
            f.specification_value
          ) {
            condition.specification_value = f.specification_value;
          }
          return { specifications: { $elemMatch: condition } };
        })
        .filter(Boolean);

      if (specConditions.length > 0) {
        filter.$and = [...(filter.$and || []), ...specConditions];
      }
    }

    const pagination = parseListPagination(body);
    const sortSpec = parseListSort(sort);
    const listQuery = BuySellProduct.find(filter)
      .select(pagination ? LIST_PRODUCT_SELECT_LITE : LIST_PRODUCT_SELECT)
      .sort(sortSpec)
      .populate("category_id", "category_name")
      .populate("subcategory_id", "sub_category_name")
      .lean();

    let list;
    let total = null;
    if (pagination) {
      listQuery.skip(pagination.skip).limit(pagination.limit);
      [total, list] = await Promise.all([
        BuySellProduct.countDocuments(filter),
        listQuery,
      ]);
    } else {
      list = await listQuery;
    }

    const trimmedList = list.map((item) => {
      if (requestedSpecIds.length === 0) return item;
      return {
        ...item,
        specifications: (item.specifications || [])
          .filter((spec) =>
            requestedSpecIds.includes(String(spec.specification_id)),
          )
          .map((spec) => {
            const matchedFilter = filters.find(
              (f) =>
                String(f.specification_id) === String(spec.specification_id),
            );
            if (
              matchedFilter &&
              Array.isArray(matchedFilter.specification_value) &&
              matchedFilter.specification_value.length > 0
            ) {
              return matchedFilter.specification_value.includes(
                String(spec.specification_value),
              )
                ? spec
                : null;
            }
            return spec;
          })
          .filter(Boolean),
      };
    });

    const withLocation = await enrichBuySellProductsWithLocation(trimmedList);
    const withSpecifications = await enrichBuySellSpecifications(withLocation);
    const includeBitRecords =
      body.include_bit_records === true || body.includeBitRecords === true;
    const enrichedList = await enrichBuySellListItems(
      withSpecifications,
      actor,
      {
        // Aggregate bid summary only — full bit_records arrays are loaded on detail views.
        includeBitRecords,
      },
    );

    // Legacy clients expect a bare array; paginated clients send page/limit.
    if (pagination) {
      const totalPages = Math.max(1, Math.ceil(total / pagination.limit));
      return res.json({
        success: true,
        data: toResponseList(enrichedList),
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages,
        },
      });
    }

    res.json(toResponseList(enrichedList));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── LEGACY LIST (GET /all) ───────────────────────────────────────────────────
// GET /api/buy-sell/all  |  GET /api/buysell/all
buySellRouter.get("/all", async (req, res) => {
  try {
    const actor = getActor(req);
    const list = await BuySellProduct.find({
      status: "pending",
    })
      .select(LIST_PRODUCT_SELECT)
      .sort({ createdAt: -1 })
      .limit(500)
      .populate("category_id", "category_name")
      .populate("subcategory_id", "sub_category_name")
      .lean();

    const withLocation = await enrichBuySellProductsWithLocation(list);
    const withSpecifications = await enrichBuySellSpecifications(withLocation);
    const enriched = await enrichBuySellListItems(withSpecifications, actor, {
      includeBitRecords: true,
    });
    res.json(toResponseList(enriched));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── BULK UPLOAD (EXCEL) ────────────────────────────────────────────────────
// POST /api/buy-sell/bulk-upload   (multipart/form-data, field name: "file")
//
// Excel headers (row 1) must match exactly:
//   Category ID | Subcategory ID | Price | Description | Country ID |
//   State ID | City ID | Address | Pincode | Status |
//   Specifications (JSON) | Images
//
// "Specifications (JSON)" cell -> JSON array string, e.g.:
//   [{"specification_id":"6a41f4e2...","specification_value":"6a48989e..."}]
//
// "Images" cell (optional) -> comma-separated URLs of already-uploaded
// images, e.g.:  /uploads/lab_123.jpg, /uploads/img_456.jpg
//
buySellRouter.post(
  "/bulk-upload",
  bulkUpload.single("file"),
  async (req, res) => {
    try {
      const actor = getActor(req);
      if (!actor.id)
        return res.status(401).json({ message: "Unauthorized user" });

      if (!req.file) {
        return res
          .status(400)
          .json({ message: "Excel file is required (form field name: file)" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!rows.length) {
        return res.status(400).json({ message: "Excel file has no data rows" });
      }

      const result = {
        total: rows.length,
        inserted: 0,
        skipped: 0,
        errors: [],
      };
      const docsToInsert = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // header row + 1-indexing

        try {
          const categoryId = toObjectId(row["Category ID"]);
          const subcategoryId = toObjectId(row["Subcategory ID"]);
          const countryId = toObjectId(row["Country ID"]);
          const stateId = toObjectId(row["State ID"]);
          const cityId = toObjectId(row["City ID"]);

          if (!categoryId) throw new Error('Missing/invalid "Category ID"');
          if (row["Price"] === "" || row["Price"] === undefined) {
            throw new Error('Missing "Price"');
          }
          if (Number.isNaN(Number(row["Price"]))) {
            throw new Error(`"Price" must be a number, got "${row["Price"]}"`);
          }

          // Specifications (JSON) - optional
          let specifications = [];
          const specRaw = row["Specifications (JSON)"];
          if (specRaw && String(specRaw).trim()) {
            try {
              const parsed = JSON.parse(specRaw);
              if (!Array.isArray(parsed)) throw new Error();
              specifications = parsed;
            } catch {
              throw new Error('Invalid JSON array in "Specifications (JSON)"');
            }
          }

          // Images - optional, comma-separated URLs
          let images = [];
          if (row["Images"] && String(row["Images"]).trim()) {
            images = String(row["Images"])
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
          }

          docsToInsert.push({
            category_id: categoryId,
            subcategory_id: subcategoryId,
            price: Number(row["Price"]),
            description: String(row["Description"] || "").trim(),
            images,
            country_id: countryId,
            state_id: stateId,
            city_id: cityId,
            address: String(row["Address"] || "").trim(),
            pincode: String(row["Pincode"] || "").trim(),
            specifications,
            userid: actor.id,
            created_by: actor.name,
            updated_by: actor.name,
            status: resolveCreateStatus(row["Status"], isAdminActor(actor)),
          });
        } catch (rowErr) {
          result.skipped++;
          result.errors.push({ row: rowNum, message: rowErr.message });
        }
      }

      let inserted = [];
      if (docsToInsert.length) {
        const listingUserId = await resolveActorMongoId(actor);
        if (!listingUserId) {
          return res.status(401).json({ message: "User account could not be resolved." });
        }
        docsToInsert.forEach((doc) => {
          doc.userid = listingUserId;
        });
        const vehicleIds = await allocateVehicleIds(docsToInsert.length);
        const bsNumbers = await allocateBsNumbers(docsToInsert.length);
        docsToInsert.forEach((doc, index) => {
          doc.vehicleId = vehicleIds[index];
          doc.bsNumber = bsNumbers[index];
        });
        // ordered:false -> one bad doc doesn't block the rest of the batch
        inserted = await BuySellProduct.insertMany(docsToInsert, {
          ordered: false,
        });
        result.inserted = inserted.length;
      }

      await Log.create({
        name: actor.name,
        email: actor.email,
        role: actor.role,
        action: `Bulk uploaded ${result.inserted} ${entityName}(s) via excel (${result.skipped} skipped)`,
      });

      res.status(200).json({
        message: `Bulk upload completed for ${entityName}`,
        ...result,
        created: inserted.map((d) => ({
          _id: d._id,
          bsNumber: formatBsNumberWithDate(d.bsNumber, d.createdAt),
          vehicleId: resolveVehicleId(d),
          category_id: d.category_id,
          price: d.price,
          status: d.status,
        })),
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error bulk uploading", error: error.message });
    }
  },
);

/** Aggregate listing + offer metrics for a product filter (sell dashboard). */
async function computeSellMetricsBlock(productFilter) {
  const productIds = await BuySellProduct.find(productFilter).distinct("_id");

  const [agg, totalOffers] = await Promise.all([
    BuySellProduct.aggregate([
      { $match: productFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    productIds.length
      ? ProductBitRecord.countDocuments({ productId: { $in: productIds } })
      : Promise.resolve(0),
  ]);

  const map = Object.fromEntries(agg.map(({ _id, count }) => [_id, count]));
  const count = (key) => map[key] || 0;

  const totalListings = Object.values(map).reduce((sum, n) => sum + n, 0);
  const activeListings = count("pending"); // "pending" is the live/visible state
  const soldVehicles = count("sold") + count("purchased");
  const totalBooked = count("booking");

  return {
    totalListings,
    activeListings,
    soldVehicles,
    totalOffers,
    totalBooked,
    totalPending: count("pending"),
    totalAccepeted: count("accepeted"),
    totalDraft: count("draft"),
    totalRejected: count("rejected"),
    totalPurchased: count("purchased"),
    totalSold: count("sold"),
  };
}

/** Short TTL cache for public-ish dashboard stats (reduces repeat home-page hits). */
const dashboardStatsCache = new Map();
const DASHBOARD_STATS_TTL_MS = 15_000;

function getDashboardStatsCacheKey(actorId) {
  return `dash-stats:${actorId || "anon"}`;
}

// ─── DASHBOARD STATS (MARKETPLACE + MY SELL) ───────────────────────────────────
// GET /api/buy-sell/dashboard-stats
buySellRouter.get("/dashboard-stats", async (req, res) => {
  try {
    const actor = getActor(req);
    const cacheKey = getDashboardStatsCacheKey(actor.id);
    const cached = dashboardStatsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json(cached.payload);
    }

    const marketplaceFilter = {
      status: {
        $in: [
          "pending",
          "accepeted",
          "booking",
          "sold",
          "purchased",
          "rejected",
        ],
      },
    };

    const [marketplace, mySell] = await Promise.all([
      computeSellMetricsBlock(marketplaceFilter),
      actor.id
        ? computeSellMetricsBlock({ userid: actor.id })
        : Promise.resolve(null),
    ]);

    const payload = {
      success: true,
      data: {
        marketplace,
        mySell,
      },
    };
    dashboardStatsCache.set(cacheKey, {
      expiresAt: Date.now() + DASHBOARD_STATS_TTL_MS,
      payload,
    });

    res.json(payload);
  } catch (error) {
    sendRouteError(res, error, "Error fetching sell dashboard stats");
  }
});

// ─── RECENT / FEATURED VEHICLES (MARKETPLACE DASHBOARD) ────────────────────────

function parseDashboardVehicleLimit(raw) {
  const parsedLimit = parseInt(String(raw ?? "8"), 10);
  return Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), 24)
    : 8;
}

/** Marketplace listings shown on the user dashboard (all sellers, newest/featured). */
function buildDashboardMarketplaceFilter() {
  return {
    status: { $in: ["pending", "accepeted", "active"] },
  };
}

async function fetchDashboardMarketplaceVehicles(actor, limit, sort) {
  const list = await BuySellProduct.find(buildDashboardMarketplaceFilter())
    .select(LIST_PRODUCT_SELECT)
    .sort(sort)
    .limit(limit)
    .populate("category_id", "category_name")
    .populate("subcategory_id", "sub_category_name")
    .lean();

  const withLocation = await enrichBuySellProductsWithLocation(list);
  const withSpecifications = await enrichBuySellSpecifications(withLocation);

  return enrichBuySellListItems(withSpecifications, actor);
}

// POST /api/buy-sell/recent-vehicles   body: { limit?: number }
buySellRouter.post("/recent-vehicles", async (req, res) => {
  try {
    const actor = getActor(req);
    const limit = parseDashboardVehicleLimit(req.body?.limit);
    const enrichedList = await fetchDashboardMarketplaceVehicles(actor, limit, {
      createdAt: -1,
    });

    res.json({
      success: true,
      data: toResponseList(enrichedList),
      total: enrichedList.length,
      limit,
    });
  } catch (error) {
    sendRouteError(res, error, "Error fetching recent vehicles");
  }
});

/** Short TTL cache for public featured strip / featured page. */
const featuredListCache = new Map();
const FEATURED_LIST_TTL_MS = 1000;

function clearFeaturedListCache() {
  featuredListCache.clear();
}

function getFeaturedListCacheKey(body) {
  return JSON.stringify({
    page: body.page ?? 1,
    limit: body.limit ?? 12,
    search: String(body.search ?? body.q ?? "")
      .trim()
      .toLowerCase(),
    sort: String(body.sort || "newest").toLowerCase(),
    actor: body.__actorKey || "anon",
  });
}

// POST /api/buy-sell/featured-vehicles/list
// body: { limit?: number, page?: number, search?: string, sort?: string }
buySellRouter.post("/featured-vehicles/list", async (req, res) => {
  try {
    const actor = getActor(req);
    const body = {
      ...(req.body || {}),
      __actorKey: actor.id ? String(actor.id) : "anon",
    };
    const cacheKey = getFeaturedListCacheKey(body);
    const cached = featuredListCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json(cached.payload);
    }

    // Query already filters expiresAt > now — expire stale rows in background.
    void expireStaleFeaturedRecords().catch(() => {});

    const page = Math.max(1, parseInt(String(body.page ?? "1"), 10) || 1);
    const rawLimit = body.limit !== undefined ? body.limit : 12;
    const limit = Math.min(
      48,
      Math.max(1, parseInt(String(rawLimit), 10) || 12),
    );
    const sortKey = String(body.sort || "newest").toLowerCase();
    const searchQ = String(body.search ?? body.q ?? "")
      .trim()
      .toLowerCase();

    const now = new Date();
    const placements = await BuySellFeaturedVehicle.find(
      liveFeaturedPlacementQuery(now),
    )
      .sort({ createdAt: -1 })
      .lean();

    const seenProductIds = new Set();
    const uniquePlacements = [];
    for (const placement of placements) {
      const key = String(placement.productId);
      if (!key || seenProductIds.has(key)) continue;
      seenProductIds.add(key);
      uniquePlacements.push(placement);
    }

    const productIds = uniquePlacements.map((p) => p.productId).filter(Boolean);
    if (productIds.length === 0) {
      const emptyPayload = {
        success: true,
        data: [],
        total: 0,
        limit,
        sort: sortKey,
        pagination: { page, limit, total: 0, totalPages: 1 },
      };
      featuredListCache.set(cacheKey, {
        expiresAt: Date.now() + FEATURED_LIST_TTL_MS,
        payload: emptyPayload,
      });
      return res.json(emptyPayload);
    }

    const products = await BuySellProduct.find({
      _id: { $in: productIds },
      status: { $in: ["pending", "accepeted", "active"] },
    })
      .select(LIST_PRODUCT_SELECT_LITE)
      .populate("category_id", "category_name")
      .populate("subcategory_id", "sub_category_name")
      .lean();

    const productById = new Map(products.map((p) => [String(p._id), p]));
    const featuredMetaByProductId = new Map();
    let orderedProducts = [];

    for (const placement of uniquePlacements) {
      const product = productById.get(String(placement.productId));
      if (!product) continue;
      orderedProducts.push(product);
      featuredMetaByProductId.set(
        String(product._id),
        buildFeaturedPublicMeta(placement),
      );
    }

    if (searchQ) {
      orderedProducts = orderedProducts.filter((item) => {
        const cat =
          item.category_id && typeof item.category_id === "object"
            ? String(item.category_id.category_name || "")
            : "";
        const sub =
          item.subcategory_id && typeof item.subcategory_id === "object"
            ? String(item.subcategory_id.sub_category_name || "")
            : "";
        const hay = [
          item.description,
          item.address,
          item.bsNumber,
          item.pincode,
          item.created_by,
          cat,
          sub,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(searchQ);
      });
    }

    orderedProducts.sort((a, b) => {
      const metaA = featuredMetaByProductId.get(String(a._id));
      const metaB = featuredMetaByProductId.get(String(b._id));
      switch (sortKey) {
        case "oldest":
          return (
            new Date(a.createdAt || 0).getTime() -
            new Date(b.createdAt || 0).getTime()
          );
        case "price_asc":
          return Number(a.price) - Number(b.price);
        case "price_desc":
          return Number(b.price) - Number(a.price);
        case "expiry_soon":
          return (
            new Date(metaA?.expiresAt || 0).getTime() -
            new Date(metaB?.expiresAt || 0).getTime()
          );
        case "newest":
        default:
          return (
            new Date(metaB?.featuredAt || b.createdAt || 0).getTime() -
            new Date(metaA?.featuredAt || a.createdAt || 0).getTime()
          );
      }
    });

    const total = orderedProducts.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const slice = orderedProducts.slice(
      (safePage - 1) * limit,
      safePage * limit,
    );

    const withSpecifications = await enrichBuySellSpecifications(slice);

    // Lite enrich — skip bid agg, seller User lookups, and location lookups
    // (cards fall back to address/pincode for location).
    const enrichedList = await enrichBuySellListItems(
      withSpecifications,
      actor,
      {
        lite: true,
      },
    );

    const data = toResponseList(enrichedList).map((item) => {
      const key = item._id || item.id;
      const meta =
        featuredMetaByProductId.get(String(key)) ||
        featuredMetaByProductId.get(String(item._id));
      if (!meta) return { ...item, isFeatured: false };
      return {
        ...item,
        featured: meta,
        isFeatured: isLiveFeaturedPlacement(meta),
      };
    });

    const payload = {
      success: true,
      data,
      total,
      limit,
      sort: sortKey,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
    };
    featuredListCache.set(cacheKey, {
      expiresAt: Date.now() + FEATURED_LIST_TTL_MS,
      payload,
    });

    res.json(payload);
  } catch (error) {
    sendRouteError(res, error, "Error fetching featured vehicles");
  }
});

// POST /api/buy-sell/featured-vehicles — activate paid featured placement (auth required)
buySellRouter.post("/featured-vehicles", async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to feature a vehicle",
      });
    }

    const { productId, orderId, paymentId, subscriptionItemId, packageName } =
      req.body || {};

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "productId is required",
      });
    }
    if (!orderId && !paymentId) {
      return res.status(400).json({
        success: false,
        message: "orderId or paymentId is required after payment verification",
      });
    }

    const result = await activateFeaturedVehicleFromPayment({
      actor,
      userId: actor.id,
      productId,
      orderId,
      paymentId,
      subscriptionItemId,
      clientPackageName: packageName,
    });

    res.status(result.created ? 201 : 200).json({
      success: true,
      message: result.duplicate
        ? "Featured vehicle already active for this payment"
        : "Featured vehicle activated",
      duplicate: result.duplicate,
      data: result.record,
    });
    if (result.created) clearFeaturedListCache();
  } catch (error) {
    sendRouteError(res, error, "Error activating featured vehicle");
  }
});

function assertAdminActor(actor) {
  if (!actor?.id) {
    const err = new Error("Authentication required");
    err.statusCode = 401;
    throw err;
  }
  if (!isAdminActor(actor)) {
    const err = new Error("Admin access required");
    err.statusCode = 403;
    throw err;
  }
}

function serializeAdminPlacement(placement) {
  const meta = buildFeaturedPublicMeta(placement) || {};
  const sellerId = placement.userId?._id || placement.userId;
  return {
    ...meta,
    _id: placement._id,
    placementId: placement._id,
    productId: placement.productId,
    userId: sellerId,
    sellerId,
    status: placement.status,
    approvalStatus:
      placement.status === "active" ? "approved" : placement.status,
    source: placement.source || meta.source,
    createdAt: placement.createdAt,
    updatedAt: placement.updatedAt,
  };
}

// POST /api/buy-sell/featured-vehicles/free-plan — seller requests Free Plan (pending until admin approval)
buySellRouter.post("/featured-vehicles/free-plan", async (req, res) => {
  try {
    const actor = getActor(req);
    const { productId, subscriptionItemId, packageName } = req.body || {};
    const result = await requestFreePlanFeaturedVehicle({
      actor,
      productId,
      subscriptionItemId,
      clientPackageName: packageName,
    });
    res.status(result.created ? 201 : 200).json({
      success: true,
      pendingApproval: true,
      featuredActivated: false,
      duplicate: result.duplicate,
      message: result.duplicate
        ? "Your Free Plan request is already pending admin approval."
        : "Free Plan request submitted. An admin will review it before your vehicle is featured.",
      data: result.record,
    });
  } catch (error) {
    sendRouteError(res, error, "Error submitting Free Plan request");
  }
});

// POST /api/buy-sell/featured-vehicles/admin — directly feature a user listing
buySellRouter.post("/featured-vehicles/admin", async (req, res) => {
  try {
    const actor = getActor(req);
    assertAdminActor(actor);
    const result = await makeFeaturedVehicleAdmin({
      actor,
      productId: req.body?.productId,
    });
    clearFeaturedListCache();
    res.status(result.created ? 201 : 200).json({
      success: true,
      duplicate: Boolean(result.duplicate),
      message: result.duplicate
        ? "This vehicle is already featured."
        : "Vehicle is now featured.",
      data: result.record,
    });
  } catch (error) {
    sendRouteError(res, error, "Error making vehicle featured");
  }
});

// GET /api/buy-sell/featured-vehicles/admin — admin placements including pending Free Plan requests
buySellRouter.get("/featured-vehicles/admin", async (req, res) => {
  try {
    const actor = getActor(req);
    assertAdminActor(actor);

    void expireStaleFeaturedRecords().catch(() => {});

    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20),
    );
    const statusFilter = String(req.query.status || "all").toLowerCase();
    const searchQ = String(req.query.search || "")
      .trim()
      .toLowerCase();
    const sortKey = String(req.query.sort || "newest").toLowerCase();

    const filter = {};
    if (statusFilter && statusFilter !== "all") {
      filter.status = statusFilter;
    }

    const placements = await BuySellFeaturedVehicle.find(filter)
      .populate("userId", "name email mobile")
      .sort({ createdAt: -1 })
      .lean();

    placements.sort((a, b) => {
      const pendingRank = (row) => (row.status === "pending" ? 0 : 1);
      const rankDiff = pendingRank(a) - pendingRank(b);
      if (rankDiff !== 0) return rankDiff;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    const productIds = placements.map((p) => p.productId).filter(Boolean);
    const products = productIds.length
      ? await BuySellProduct.find({ _id: { $in: productIds } })
          .select(LIST_PRODUCT_SELECT_LITE)
          .populate("category_id", "category_name")
          .populate("subcategory_id", "sub_category_name")
          .lean()
      : [];
    const productById = new Map(products.map((p) => [String(p._id), p]));

    let rows = [];
    for (const placement of placements) {
      const product = productById.get(String(placement.productId));
      if (!product) continue;
      const serializedPlacement = serializeAdminPlacement(placement);
      rows.push({
        ...product,
        placement: serializedPlacement,
        featured: serializedPlacement,
        isFeatured: isLiveFeaturedPlacement(serializedPlacement),
        sellerName:
          serializedPlacement.requester?.name || product.sellerName || product.created_by,
      });
    }

    if (searchQ) {
      rows = rows.filter((item) => {
        const hay = [
          item.description,
          item.address,
          item.bsNumber,
          item.vehicleId,
          item.sellerName,
          item.placement?.requester?.name,
          item.placement?.requester?.email,
          item.placement?.requester?.mobile,
          item.placement?.packageName,
          item.placement?.source,
          item.placement?.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(searchQ);
      });
    }

    if (sortKey === "oldest") {
      rows.sort(
        (a, b) =>
          new Date(a.placement?.createdAt || 0) -
          new Date(b.placement?.createdAt || 0),
      );
    }

    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const slice = rows.slice((safePage - 1) * limit, safePage * limit);
    const enrichedList = await enrichBuySellListItems(slice, actor, { lite: true });
    const data = toResponseList(enrichedList).map((item, index) => ({
      ...item,
      placement: slice[index]?.placement || item.placement,
      featured: slice[index]?.featured || item.featured,
    }));

    res.json({
      success: true,
      data,
      total,
      limit,
      sort: sortKey,
      pagination: { page: safePage, limit, total, totalPages },
    });
  } catch (error) {
    sendRouteError(res, error, "Error fetching admin featured vehicles");
  }
});

// PATCH /api/buy-sell/featured-vehicles/admin/:placementId — approve / reject / toggle
buySellRouter.patch("/featured-vehicles/admin/:placementId", async (req, res) => {
  try {
    const actor = getActor(req);
    assertAdminActor(actor);
    const { status, reason } = req.body || {};
    const result = await updateFeaturedPlacementAdminStatus({
      actor,
      placementId: req.params.placementId,
      status,
      reason,
    });
    clearFeaturedListCache();
    const nextStatus = result.record?.status;
    const message =
      nextStatus === "active"
        ? "Free Plan approved. Vehicle is now featured."
        : nextStatus === "rejected"
          ? "Free Plan request rejected."
          : nextStatus === "cancelled"
            ? "Featured vehicle disabled."
            : "Featured vehicle updated.";
    res.json({
      success: true,
      message: result.alreadyApproved
        ? "This Free Plan request is already approved."
        : result.alreadyRejected
          ? "This Free Plan request is already rejected."
          : message,
      data: result.record,
    });
  } catch (error) {
    sendRouteError(res, error, "Error updating featured vehicle");
  }
});

// DELETE /api/buy-sell/featured-vehicles/admin/:placementId
buySellRouter.delete("/featured-vehicles/admin/:placementId", async (req, res) => {
  try {
    const actor = getActor(req);
    assertAdminActor(actor);
    await removeFeaturedPlacementAdmin(req.params.placementId);
    clearFeaturedListCache();
    res.json({ success: true, message: "Featured vehicle removed" });
  } catch (error) {
    sendRouteError(res, error, "Error removing featured vehicle");
  }
});

// ─── STATUS COUNTS (DASHBOARD) ─────────────────────────────────────────────────
// GET /api/buy-sell/status-counts
buySellRouter.get("/status-counts", async (req, res) => {
  try {
    const actor = getActor(req);
    const filter = {};
    if (!isAdminActor(actor) && actor.id) {
      filter.userid = actor.id;
    }

    const agg = await BuySellProduct.aggregate([
      ...(Object.keys(filter).length ? [{ $match: filter }] : []),
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const map = Object.fromEntries(agg.map(({ _id, count }) => [_id, count]));
    const count = (key) => map[key] || 0;

    res.json({
      success: true,
      data: {
        totalPending: count("pending"),
        totalAccepeted: count("accepeted"),
        totalBooked: count("booking"),
        totalPurchased: count("purchased"),
        totalSold: count("sold"),
        totalRejected: count("rejected"),
        totalDraft: count("draft"),
        total: Object.values(map).reduce((sum, n) => sum + n, 0),
      },
    });
  } catch (error) {
    sendRouteError(res, error, "Error fetching product status counts");
  }
});

// ─── UPDATE STATUS (ADMIN / CONTROLLED TRANSITIONS) ───────────────────────────
// PUT /api/buy-sell/status/:id
buySellRouter.put("/status/:id", async (req, res) => {
  try {
    const actor = getActor(req);
    const resolvedId = await resolveToObjectId(BuySellProduct, req.params.id);
    if (!resolvedId) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    const product = await BuySellProduct.findById(resolvedId).lean();
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    const nextStatus = normaliseStatus(req.body?.status, null);
    if (!nextStatus) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product status." });
    }

    const lifecycleStatuses = ["booking", "purchased", "sold"];
    if (lifecycleStatuses.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message:
          "Use the booking, purchase, or sold API for this status change.",
      });
    }

    if (product.status === "sold") {
      return res
        .status(400)
        .json({ success: false, message: "Product is already sold." });
    }

    const isAdmin = isAdminActor(actor);
    const isOwner = isSameUserAsActor(product.userid, actor);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this product status.",
      });
    }

    // Non-admin owners may move their listing between draft and pending.
    if (
      !isAdmin &&
      product.status !== nextStatus &&
      !isOwnerDraftPendingSwitch(product.status, nextStatus)
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only save this listing as draft or pending.",
      });
    }

    assertStatusTransition(product.status, nextStatus);

    const updated = await BuySellProduct.findByIdAndUpdate(
      resolvedId,
      { $set: { status: nextStatus, updated_by: actor.name } },
      { new: true },
    ).lean();

    await Log.create({
      name: actor.name,
      email: actor.email,
      role: actor.role,
      action: `Updated ${entityName} status ${product.status} → ${nextStatus} (${resolvedId})`,
    });

    res.json({
      success: true,
      message: "Product status updated successfully.",
      data: { _id: updated._id, id: updated.id, status: updated.status },
    });
  } catch (error) {
    sendRouteError(res, error, "Error updating product status");
  }
});

// ─── BOOK PRODUCT (ADVANCE PAYMENT) ───────────────────────────────────────────
// POST /api/buy-sell/book/:id
buySellRouter.post("/book/:id", async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor.id) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized user" });
    }

    const resolvedId = await resolveToObjectId(BuySellProduct, req.params.id);
    if (!resolvedId) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    const product = await BuySellProduct.findById(resolvedId).lean();
    assertProductAvailableForBooking(product);

    if (isSameUserAsActor(product.userid, actor)) {
      return res.status(400).json({
        success: false,
        message: "You cannot book your own product.",
      });
    }

    const advanceAmount = Number(req.body?.advanceAmount ?? req.body?.amount);
    if (!Number.isFinite(advanceAmount) || advanceAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid advance amount is required.",
      });
    }

    const updated = await BuySellProduct.findOneAndUpdate(
      { _id: resolvedId, status: { $in: ["pending", "accepeted"] } },
      {
        $set: {
          status: "booking",
          bookedBy: actor.id,
          bookedAt: new Date(),
          advanceAmount,
          updated_by: actor.name,
        },
      },
      { new: true },
    ).lean();

    if (!updated) {
      return res.status(400).json({
        success: false,
        message: "Product is currently booked.",
      });
    }

    await Log.create({
      name: actor.name,
      email: actor.email,
      role: actor.role,
      action: `Booked ${entityName} (${resolvedId}) with advance ₹${advanceAmount}`,
    });

    const pName = productLabel(updated);
    const bookingId = updated.id || String(updated._id);
    const buyerName = actor.name || "Buyer";
    notify({
      userId: actor.id,
      event: NOTIFICATION_EVENTS.PRODUCT_BOOKING,
      data: {
        userName: buyerName,
        productName: pName,
        amount: advanceAmount,
        bookingId,
      },
      metadata: buildProductPushMetadata(updated, { status: 'booking' }),
    }).catch((err) =>
      console.error("[buysell book] notification failed:", err.message),
    );

    if (updated.userid && String(updated.userid) !== String(actor.id)) {
      notify({
        userId: updated.userid,
        event: NOTIFICATION_EVENTS.PRODUCT_BOOKING,
        data: {
          buyerName,
          productName: pName,
          amount: advanceAmount,
          bookingId,
        },
        metadata: buildProductPushMetadata(updated, { role: 'seller', status: 'booking' }),
      }).catch((err) =>
        console.error(
          "[buysell book] seller notification failed:",
          err.message,
        ),
      );
    }

    res.status(200).json({
      success: true,
      message: "Product booked successfully.",
      subMessage: "Advance payment received.",
      data: {
        _id: updated._id,
        id: updated.id,
        status: updated.status,
        bookedBy: updated.bookedBy,
        bookedAt: updated.bookedAt,
        advanceAmount: updated.advanceAmount,
      },
    });
  } catch (error) {
    sendRouteError(res, error, "Error booking product");
  }
});

// ─── PURCHASE PRODUCT (FINAL PAYMENT) ─────────────────────────────────────────
// POST /api/buy-sell/purchase/:id
buySellRouter.post("/purchase/:id", async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor.id) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized user" });
    }

    const resolvedId = await resolveToObjectId(BuySellProduct, req.params.id);
    if (!resolvedId) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    const product = await BuySellProduct.findById(resolvedId).lean();
    assertProductAvailableForPurchase(product, actor);

    const purchaseAmount = Number(
      req.body?.purchaseAmount ?? req.body?.amount ?? req.body?.remainingAmount,
    );
    if (!Number.isFinite(purchaseAmount) || purchaseAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid purchase amount is required.",
      });
    }

    const updated = await BuySellProduct.findOneAndUpdate(
      {
        _id: resolvedId,
        status: "booking",
        bookedBy: actor.id,
      },
      {
        $set: {
          status: "purchased",
          purchasedBy: actor.id,
          purchasedAt: new Date(),
          purchaseAmount,
          updated_by: actor.name,
        },
      },
      { new: true },
    ).lean();

    if (!updated) {
      return res.status(400).json({
        success: false,
        message: "Product is not available for purchase.",
      });
    }

    await Log.create({
      name: actor.name,
      email: actor.email,
      role: actor.role,
      action: `Purchased ${entityName} (${resolvedId}) for ₹${purchaseAmount}`,
    });

    const pName = productLabel(updated);
    const buyerName = actor.name || "Buyer";
    notify({
      userId: actor.id,
      event: NOTIFICATION_EVENTS.PRODUCT_PURCHASED,
      data: {
        userName: buyerName,
        productName: pName,
        amount: purchaseAmount,
      },
      metadata: buildProductPushMetadata(updated, { status: 'purchased' }),
    }).catch((err) =>
      console.error("[buysell purchase] notification failed:", err.message),
    );

    if (updated.userid) {
      notify({
        userId: updated.userid,
        event: NOTIFICATION_EVENTS.PRODUCT_SOLD,
        data: {
          productName: pName,
          amount: purchaseAmount,
          buyerName: actor.name,
        },
        metadata: buildProductPushMetadata(updated, { status: 'sold' }),
      }).catch((err) =>
        console.error(
          "[buysell purchase] sold notification failed:",
          err.message,
        ),
      );
    }

    res.status(200).json({
      success: true,
      message: "Product purchased successfully.",
      data: {
        _id: updated._id,
        id: updated.id,
        status: updated.status,
        purchasedBy: updated.purchasedBy,
        purchasedAt: updated.purchasedAt,
        purchaseAmount: updated.purchaseAmount,
      },
    });
  } catch (error) {
    sendRouteError(res, error, "Error purchasing product");
  }
});

// ─── MARK PRODUCT AS SOLD ─────────────────────────────────────────────────────
// PUT /api/buy-sell/mark-sold/:id
buySellRouter.put("/mark-sold/:id", async (req, res) => {
  try {
    const actor = getActor(req);
    const resolvedId = await resolveToObjectId(BuySellProduct, req.params.id);
    if (!resolvedId) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    const product = await BuySellProduct.findById(resolvedId).lean();
    assertProductAvailableForSold(product);

    const isOwner = isSameUserAsActor(product.userid, actor);
    const isBuyer = isSameUserAsActor(product.purchasedBy, actor);

    if (!isAdminActor(actor) && !isOwner && !isBuyer) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to mark this product as sold.",
      });
    }

    const updated = await BuySellProduct.findOneAndUpdate(
      { _id: resolvedId, status: "purchased" },
      {
        $set: {
          status: "sold",
          soldAt: new Date(),
          updated_by: actor.name,
        },
      },
      { new: true },
    ).lean();

    if (!updated) {
      return res.status(400).json({
        success: false,
        message: "Invalid product status.",
      });
    }

    await Log.create({
      name: actor.name,
      email: actor.email,
      role: actor.role,
      action: `Marked ${entityName} as sold (${resolvedId})`,
    });

    res.json({
      success: true,
      message: "Product marked as sold.",
      data: {
        _id: updated._id,
        id: updated.id,
        status: updated.status,
        soldAt: updated.soldAt,
      },
    });
  } catch (error) {
    sendRouteError(res, error, "Error marking product as sold");
  }
});

// ─── CART ─────────────────────────────────────────────────────────────────────
// GET /api/buy-sell/cart
buySellRouter.get("/cart", async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor.id) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized user" });
    }

    const userOid = toObjectId(actor.id);
    const items = await BuySellCart.find({ userId: userOid })
      .sort({ createdAt: -1 })
      .lean();

    const productIds = items.map((i) => i.productId);
    const products = productIds.length
      ? await BuySellProduct.find({ _id: { $in: productIds } })
          .populate("category_id", "category_name")
          .populate("subcategory_id", "sub_category_name")
          .lean()
      : [];

    const productMap = Object.fromEntries(
      products.map((p) => [String(p._id), p]),
    );

    const cartItems = items
      .map((item) => {
        const product = productMap[String(item.productId)];
        if (!product) return null;
        return {
          ...toResponse(item),
          product: {
            ...product,
            bsNumber:
              formatBsNumberWithDate(product.bsNumber, product.createdAt) ||
              null,
            vehicleId: resolveVehicleId(product),
          },
        };
      })
      .filter(Boolean);

    res.json({ success: true, items: cartItems, count: cartItems.length });
  } catch (error) {
    sendRouteError(res, error, "Error fetching cart");
  }
});

// POST /api/buy-sell/cart/add
buySellRouter.post("/cart/add", async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor.id) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized user" });
    }

    const productIdRaw = req.body?.productId || req.body?.id;
    const resolvedId = await resolveToObjectId(BuySellProduct, productIdRaw);
    if (!resolvedId) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    const product = await BuySellProduct.findById(resolvedId).lean();
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }
    if (product.status !== "pending" && product.status !== "accepeted") {
      return res.status(400).json({
        success: false,
        message: "Only pending products can be added to cart.",
      });
    }
    if (isSameUserAsActor(product.userid, actor)) {
      return res.status(400).json({
        success: false,
        message: "You cannot add your own product to cart.",
      });
    }

    const userOid = toObjectId(actor.id);
    const existing = await BuySellCart.findOne({
      userId: userOid,
      productId: resolvedId,
    });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Product is already in your cart.",
        item: toResponse(existing),
      });
    }

    const item = await BuySellCart.create({
      userId: userOid,
      productId: resolvedId,
    });

    res.status(201).json({
      success: true,
      message: "Product added to cart.",
      item: toResponse(item),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({
        success: true,
        message: "Product is already in your cart.",
      });
    }
    sendRouteError(res, error, "Error adding to cart");
  }
});

// DELETE /api/buy-sell/cart/remove
buySellRouter.delete("/cart/remove", async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor.id) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized user" });
    }

    const productIdRaw = req.body?.productId || req.body?.id;
    const resolvedId = await resolveToObjectId(BuySellProduct, productIdRaw);
    if (!resolvedId) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    const userOid = toObjectId(actor.id);
    await BuySellCart.deleteOne({ userId: userOid, productId: resolvedId });

    res.json({ success: true, message: "Product removed from cart." });
  } catch (error) {
    sendRouteError(res, error, "Error removing from cart");
  }
});

// ─── RAZORPAY — PRODUCT PAYMENTS ──────────────────────────────────────────────
// POST /api/buy-sell/payment/create-order
// Body: { productId, paymentType: "advance" | "remaining" | "full", amount? }
buySellRouter.post("/payment/create-order", async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor.id) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized user" });
    }

    const {
      productId,
      paymentType = "advance",
      amount: bodyAmount,
    } = req.body || {};
    const type = String(paymentType).toLowerCase().trim();
    if (!["advance", "remaining", "full"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "paymentType must be advance, remaining, or full.",
      });
    }

    const resolvedId = await resolveToObjectId(BuySellProduct, productId);
    if (!resolvedId) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    const product = await BuySellProduct.findById(resolvedId).lean();
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }
    if (isSameUserAsActor(product.userid, actor)) {
      return res.status(400).json({
        success: false,
        message: "You cannot purchase your own product.",
      });
    }

    let payAmount = 0;
    if (type === "advance") {
      assertProductAvailableForBooking(product);
      payAmount = computeAdvanceAmount(product, bodyAmount);
    } else if (type === "remaining") {
      assertProductAvailableForPurchase(product, actor);
      payAmount = computeRemainingAmount(product);
    } else {
      assertProductAvailableForBooking(product);
      payAmount = Number(product.price) || 0;
    }

    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount.",
      });
    }

    const receipt = `prod_${String(resolvedId).slice(-8)}_${Date.now()}`.slice(
      0,
      40,
    );

    const order = await getRazorpay().orders.create({
      amount: Math.round(payAmount * 100),
      currency: "INR",
      receipt,
      notes: {
        productId: String(resolvedId),
        paymentType: type,
        userId: String(actor.id),
        bsNumber: product.bsNumber || "",
      },
    });

    await Transaction.create({
      orderId: order.id,
      userId: String(actor.id),
      packageId: String(resolvedId),
      packageDuration: 0,
      price: payAmount,
      status: "created",
      orderDetails: {
        ...order,
        paymentPurpose: "buysell_product",
        paymentType: type,
        productId: String(resolvedId),
      },
    });

    res.status(201).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_T2J2vGFVIw0xpl",
      paymentType: type,
      payAmount,
      productId: String(resolvedId),
    });
  } catch (error) {
    sendRouteError(res, error, "Error creating payment order");
  }
});

// POST /api/buy-sell/payment/verify
buySellRouter.post("/payment/verify", async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor.id) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized user" });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      productId,
      paymentType,
    } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification details are required.",
      });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET || "OO8ZuWKdDAdJ2mS8OJMpukAb",
      )
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await Transaction.findOneAndUpdate(
        { orderId: razorpay_order_id },
        { status: "failed", errorDetails: "invalid signature" },
      );
      return res.status(400).json({
        success: false,
        message: "Payment verification failed: invalid signature.",
      });
    }

    const tx = await Transaction.findOne({ orderId: razorpay_order_id }).lean();
    const resolvedProductId = await resolveToObjectId(
      BuySellProduct,
      productId || tx?.orderDetails?.productId || tx?.packageId,
    );
    if (!resolvedProductId) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    const type = String(
      paymentType || tx?.orderDetails?.paymentType || "advance",
    )
      .toLowerCase()
      .trim();

    const payAmount = Number(tx?.price) || 0;

    let updated = null;
    if (type === "advance") {
      updated = await BuySellProduct.findOneAndUpdate(
        { _id: resolvedProductId, status: { $in: ["pending", "accepeted"] } },
        {
          $set: {
            status: "booking",
            bookedBy: actor.id,
            bookedAt: new Date(),
            advanceAmount: payAmount,
            updated_by: actor.name,
          },
        },
        { new: true },
      ).lean();
      if (!updated) {
        return res.status(400).json({
          success: false,
          message: "Product is currently booked.",
        });
      }
    } else if (type === "remaining") {
      updated = await BuySellProduct.findOneAndUpdate(
        {
          _id: resolvedProductId,
          status: "booking",
          bookedBy: actor.id,
        },
        {
          $set: {
            status: "purchased",
            purchasedBy: actor.id,
            purchasedAt: new Date(),
            purchaseAmount: payAmount,
            updated_by: actor.name,
          },
        },
        { new: true },
      ).lean();
      if (!updated) {
        return res.status(400).json({
          success: false,
          message: "Product is not available for purchase.",
        });
      }
    } else {
      updated = await BuySellProduct.findOneAndUpdate(
        { _id: resolvedProductId, status: { $in: ["pending", "accepeted"] } },
        {
          $set: {
            status: "purchased",
            purchasedBy: actor.id,
            purchasedAt: new Date(),
            purchaseAmount: payAmount,
            advanceAmount: payAmount,
            updated_by: actor.name,
          },
        },
        { new: true },
      ).lean();
      if (!updated) {
        return res.status(400).json({
          success: false,
          message: "Product is not available for purchase.",
        });
      }
    }

    await Transaction.findOneAndUpdate(
      { orderId: razorpay_order_id },
      {
        status: "success",
        paymentId: razorpay_payment_id,
        razorpayResponse: {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
        },
      },
    );

    await removeProductFromAllCarts(resolvedProductId);

    try {
      await createBuySellPaymentTransactions(
        updated,
        actor.id,
        payAmount,
        type,
      );
    } catch (txErr) {
      console.error(
        "[buysell payment verify] income/expense error:",
        txErr.message,
      );
    }

    const message =
      type === "advance"
        ? "Product booked successfully."
        : "Product purchased successfully.";

    await Log.create({
      name: actor.name,
      email: actor.email,
      role: actor.role,
      action: `Razorpay ${type} payment for ${entityName} (${resolvedProductId}) — ₹${payAmount}`,
    });

    const pName = productLabel(updated);
    const bookingId = updated.id || String(updated._id);
    const txnId = razorpay_payment_id;
    const buyerName = actor.name || "Buyer";

    if (type === "advance") {
      notify({
        userId: actor.id,
        event: NOTIFICATION_EVENTS.PRODUCT_BOOKING,
        data: {
          userName: buyerName,
          productName: pName,
          amount: payAmount,
          bookingId,
          transactionId: txnId,
        },
        metadata: buildProductPushMetadata(updated, {
          orderId: razorpay_order_id,
          status: 'booking',
        }),
      }).catch((err) =>
        console.error(
          "[buysell verify] booking notification failed:",
          err.message,
        ),
      );

      if (updated.userid && String(updated.userid) !== String(actor.id)) {
        notify({
          userId: updated.userid,
          event: NOTIFICATION_EVENTS.PRODUCT_BOOKING,
          data: {
            buyerName,
            productName: pName,
            amount: payAmount,
            bookingId,
            transactionId: txnId,
          },
          metadata: buildProductPushMetadata(updated, {
            orderId: razorpay_order_id,
            role: 'seller',
            status: 'booking',
          }),
        }).catch((err) =>
          console.error(
            "[buysell verify] seller booking notification failed:",
            err.message,
          ),
        );
      }
    } else {
      notify({
        userId: actor.id,
        event: NOTIFICATION_EVENTS.PRODUCT_PURCHASED,
        data: {
          userName: buyerName,
          productName: pName,
          amount: payAmount,
          transactionId: txnId,
        },
        metadata: buildProductPushMetadata(updated, {
          orderId: razorpay_order_id,
          status: 'purchased',
        }),
      }).catch((err) =>
        console.error(
          "[buysell verify] purchase notification failed:",
          err.message,
        ),
      );

      if (updated.userid) {
        notify({
          userId: updated.userid,
          event: NOTIFICATION_EVENTS.PRODUCT_SOLD,
          data: {
            productName: pName,
            amount: payAmount,
            buyerName,
          },
          metadata: buildProductPushMetadata(updated, { status: 'sold' }),
        }).catch((err) =>
          console.error(
            "[buysell verify] sold notification failed:",
            err.message,
          ),
        );
      }
    }

    notify({
      userId: actor.id,
      event: NOTIFICATION_EVENTS.PAYMENT_SUCCESS,
      data: {
        userName: buyerName,
        productName: pName,
        amount: payAmount,
        transactionId: txnId,
      },
      metadata: buildProductPushMetadata(updated, {
        orderId: razorpay_order_id,
        status: 'payment_success',
      }),
    }).catch((err) =>
      console.error(
        "[buysell verify] payment notification failed:",
        err.message,
      ),
    );

    if (updated.userid && String(updated.userid) !== String(actor.id)) {
      notify({
        userId: updated.userid,
        event: NOTIFICATION_EVENTS.PAYMENT_SUCCESS,
        data: {
          buyerName,
          productName: pName,
          amount: payAmount,
          transactionId: txnId,
        },
        metadata: buildProductPushMetadata(updated, {
          orderId: razorpay_order_id,
          role: 'seller',
          status: 'payment_success',
        }),
      }).catch((err) =>
        console.error(
          "[buysell verify] seller payment notification failed:",
          err.message,
        ),
      );
    }

    res.json({
      success: true,
      message,
      subMessage: type === "advance" ? "Advance payment received." : undefined,
      data: {
        _id: updated._id,
        id: updated.id,
        status: updated.status,
        paymentType: type,
      },
    });
  } catch (error) {
    sendRouteError(res, error, "Error verifying product payment");
  }
});

// ─── CREATE ───────────────────────────────────────────────────────────────────
buySellRouter.post("/add", upload.array("images", 10), async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor.id)
      return res.status(401).json({ message: "Unauthorized user" });

    // bsNumber and vehicleId are always generated on the server. Ignore any client value.
    delete req.body.bsNumber;
    delete req.body.vehicleId;

    const {
      category_id,
      subcategory_id,
      price,
      description,
      country_id,
      state_id,
      city_id,
      address,
      pincode,
      specifications,
      // Client sends "draft" | "pending" — normalised via resolveCreateStatus
      status,
      userid: bodyUserid,
      userId: bodyUserId,
      ownerId: bodyOwnerId,
    } = req.body;

    if (!category_id || !subcategory_id) {
      return res.status(400).json({
        message: "Category and subcategory are required.",
      });
    }

    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return res
        .status(400)
        .json({ message: "A valid price greater than zero is required." });
    }

    let bodyImages = [];
    if (req.body.images) {
      try {
        bodyImages = Array.isArray(req.body.images)
          ? req.body.images
          : JSON.parse(req.body.images);
      } catch {
        bodyImages = [];
      }
    }

    const uploadedImages = (req.files || []).map((f) =>
      buildImageUrl(f.filename),
    );
    const allImages = [...bodyImages, ...uploadedImages];

    let parsedSpecs = [];
    if (specifications) {
      try {
        parsedSpecs =
          typeof specifications === "string"
            ? JSON.parse(specifications)
            : specifications;
      } catch {
        parsedSpecs = [];
      }
    }

    // Location refs must be Mongo ObjectIds. Clients may send externalId / uuid / _id.
    let resolvedCountryId = await resolveLocationMongoId(
      LocationCountry,
      country_id,
    );
    if (!resolvedCountryId) {
      resolvedCountryId = await resolveDefaultIndiaCountryId();
    }
    const resolvedStateId = await resolveLocationMongoId(
      LocationState,
      state_id,
    );
    const resolvedCityId = await resolveLocationMongoId(LocationCity, city_id);

    if (!resolvedCountryId) {
      return res.status(400).json({
        message: "Country is required. Default India could not be resolved.",
      });
    }
    if (!resolvedStateId || !resolvedCityId) {
      return res.status(400).json({
        message: "State and city are required.",
      });
    }

    // Regular users always own their own listing. If an admin sends a user
    // id, post the vehicle under that account instead of the admin.
    let listingUserId = await resolveActorMongoId(actor);
    if (!listingUserId) {
      return res.status(401).json({ message: "User account could not be resolved." });
    }
    let listingCreatedBy = actor.name;
    if (isAdminActor(actor)) {
      const requestedUserId = bodyUserid || bodyUserId || bodyOwnerId;
      if (requestedUserId) {
        const ownerUser = await findUserByEitherId(String(requestedUserId));
        if (!ownerUser?._id) {
          return res.status(400).json({ message: "Selected user not found." });
        }
        listingUserId = ownerUser._id;
        listingCreatedBy = ownerUser.name || actor.name;
      }
    }

    let item;
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        item = await BuySellProduct.create({
          category_id: toObjectId(category_id),
          subcategory_id: toObjectId(subcategory_id),
          bsNumber: await generateNextBsNumber(new Date()),
          vehicleId: await generateNextVehicleId(new Date()),
          price: numericPrice,
          description: description || "",
          images: allImages,
          country_id: resolvedCountryId,
          state_id: resolvedStateId,
          city_id: resolvedCityId,
          address: address || "",
          pincode: pincode || "",
          specifications: Array.isArray(parsedSpecs) ? parsedSpecs : [],
          userid: listingUserId,
          created_by: listingCreatedBy,
          updated_by: actor.name,
          // ── Honour client's draft/pending choice; fall back to "pending" ──────
          status: resolveCreateStatus(status, isAdminActor(actor)),
        });
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        const message = String((err && err.message) || "");
        if (
          attempt < 2 &&
          err &&
          (err.code === 11000 || String(err.code) === "11000") &&
          message.includes("bsNumber_1") ||
          message.includes("vehicleId_1")
        ) {
          console.warn(
            "[buy-sell add] duplicate bsNumber detected, retrying create",
            message,
          );
          continue;
        }
        throw err;
      }
    }

    if (!item) {
      throw (
        lastError ||
        new Error(
          "Failed to create BuySell product after retrying bsNumber generation.",
        )
      );
    }

    await Log.create({
      name: actor.name,
      email: actor.email,
      role: actor.role,
      action: `Created ${entityName}`,
    });

    const populated = await BuySellProduct.findById(item._id)
      .populate("category_id", "category_name")
      .populate("subcategory_id", "sub_category_name")
      .lean();

    const response = await buildEnrichedResponse(populated);
    res
      .status(201)
      .json({ message: "Created successfully", product: response });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── UPDATE ───────────────────────────────────────────────────────────────────
buySellRouter.put("/edit/:id", upload.array("images", 10), async (req, res) => {
  try {
    const actor = getActor(req);

    const resolvedId = await resolveToObjectId(BuySellProduct, req.params.id);
    if (!resolvedId) return res.status(404).json({ message: "Not found" });

    const existing = await BuySellProduct.findById(resolvedId).lean();
    if (!existing) return res.status(404).json({ message: "Not found" });

    try {
      assertProductEditable(existing, actor);
    } catch (err) {
      return sendRouteError(res, err, "Product cannot be updated");
    }

    // Only owner or admin may edit
    if (!canManageBuySellProduct(existing, actor)) {
      return res
        .status(403)
        .json({ message: "You do not have permission to edit this product." });
    }

    let bodyImages = null;
    if (
      req.body.images !== undefined &&
      req.body.images !== null &&
      req.body.images !== ""
    ) {
      try {
        const parsed = Array.isArray(req.body.images)
          ? req.body.images
          : JSON.parse(req.body.images);
        bodyImages = Array.isArray(parsed)
          ? parsed.map((u) => String(u || "").trim()).filter(Boolean)
          : [];
      } catch {
        bodyImages = [];
      }
    }

    let existingImages = null;
    if (
      req.body.existing_images !== undefined &&
      req.body.existing_images !== null &&
      req.body.existing_images !== ""
    ) {
      try {
        const parsed = Array.isArray(req.body.existing_images)
          ? req.body.existing_images
          : JSON.parse(req.body.existing_images);
        existingImages = Array.isArray(parsed)
          ? parsed.map((u) => String(u || "").trim()).filter(Boolean)
          : [];
      } catch {
        existingImages = [];
      }
    }

    const uploadedImages = (req.files || []).map((f) =>
      buildImageUrl(f.filename),
    );

    // Prefer `images` (frontend URL list from /api/upload), then `existing_images`,
    // then keep DB images when only multipart files are added.
    const hasImageUpdate =
      bodyImages !== null ||
      existingImages !== null ||
      uploadedImages.length > 0;
    let mergedImages;
    if (hasImageUpdate) {
      const base =
        bodyImages !== null
          ? bodyImages
          : existingImages !== null
            ? existingImages
            : Array.isArray(existing.images)
              ? existing.images
              : [];
      mergedImages = [...base, ...uploadedImages];
    }

    let parsedSpecs;
    if (req.body.specifications) {
      try {
        parsedSpecs =
          typeof req.body.specifications === "string"
            ? JSON.parse(req.body.specifications)
            : req.body.specifications;
      } catch {
        parsedSpecs = undefined;
      }
    }

    const updatePayload = {
      ...req.body,
      updated_by: actor.name,
    };

    delete updatePayload.existing_images;
    delete updatePayload.images;
    delete updatePayload._id;
    delete updatePayload.id;
    delete updatePayload.userid;
    delete updatePayload.created_by;
    delete updatePayload.createdAt;
    delete updatePayload.updatedAt;
    delete updatePayload.__v;
    delete updatePayload.bsNumber;
    delete updatePayload.vehicleId;

    if (hasImageUpdate) {
      updatePayload.images = mergedImages;
    }

    if (req.body.category_id !== undefined) {
      updatePayload.category_id = toObjectId(req.body.category_id);
    }
    if (req.body.subcategory_id !== undefined) {
      updatePayload.subcategory_id = toObjectId(req.body.subcategory_id);
    }
    // Never wipe location with empty strings from a partially hydrated form.
    if (req.body.country_id !== undefined) {
      const id = await resolveLocationMongoId(
        LocationCountry,
        req.body.country_id,
      );
      if (id) updatePayload.country_id = id;
      else delete updatePayload.country_id;
    }
    if (req.body.state_id !== undefined) {
      const id = await resolveLocationMongoId(LocationState, req.body.state_id);
      if (id) updatePayload.state_id = id;
      else delete updatePayload.state_id;
    }
    if (req.body.city_id !== undefined) {
      const id = await resolveLocationMongoId(LocationCity, req.body.city_id);
      if (id) updatePayload.city_id = id;
      else delete updatePayload.city_id;
    }
    if (req.body.price !== undefined) {
      const numericPrice = Number(req.body.price);
      if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
        return res
          .status(400)
          .json({ message: "A valid price greater than zero is required." });
      }
      updatePayload.price = numericPrice;
    }

    if (parsedSpecs !== undefined) updatePayload.specifications = parsedSpecs;

    // Validate status transition when status is being changed
    if (updatePayload.status !== undefined) {
      const nextStatus = normaliseStatus(updatePayload.status, null);
      if (!nextStatus) {
        return res.status(400).json({ message: "Invalid product status." });
      }

      // "accepeted" is only ever set via PUT /bit/accept/:id, never through
      // generic edit — same as booking/purchased/sold.
      const lifecycleStatuses = ["booking", "purchased", "sold", "accepeted"];
      if (lifecycleStatuses.includes(nextStatus)) {
        return res.status(400).json({
          message:
            "Use the bid-accept, booking, or purchase API for this status change.",
        });
      }

      const adminOnlyTargets = ["rejected"];
      if (adminOnlyTargets.includes(nextStatus) && !isAdminActor(actor)) {
        return res.status(403).json({
          message: "Only an admin can reject a product.",
        });
      }

      // Sellers may keep their current status, or move between draft / pending
      // (including unpublishing a live listing back to draft).
      if (
        !isAdminActor(actor) &&
        nextStatus !== canonicalStatus(existing.status) &&
        !isOwnerDraftPendingSwitch(existing.status, nextStatus)
      ) {
        return res.status(403).json({
          message: "You can only save this listing as draft or pending.",
        });
      }

      try {
        assertStatusTransition(existing.status, nextStatus);
      } catch (err) {
        return sendRouteError(res, err, "Invalid status transition");
      }

      updatePayload.status = nextStatus;
    } else {
      delete updatePayload.status;
    }

    // Prevent lifecycle fields from being set directly via generic edit
    delete updatePayload.bookedBy;
    delete updatePayload.bookedAt;
    delete updatePayload.advanceAmount;
    delete updatePayload.purchasedBy;
    delete updatePayload.purchasedAt;
    delete updatePayload.purchaseAmount;
    delete updatePayload.soldAt;

    await BuySellProduct.findByIdAndUpdate(resolvedId, updatePayload, {
      new: true,
    });

    const populated = await BuySellProduct.findById(resolvedId)
      .populate("category_id", "category_name")
      .populate("subcategory_id", "sub_category_name")
      .lean();

    const response = await buildEnrichedResponse(populated);
    res.json({ message: "Updated successfully", product: response });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// ─── PURCHASED / NON-PURCHASED LIST ────────────────────────────────────────────
// POST /api/buy-sell/purchase-list
// Same request payload as /list (category_id, subcategory_id, status, country_id,
// state_id, city_id, min_price, max_price, filters). Excludes the logged-in
// user's own listings and optionally filters by status (omit or "all" = no filter).
// Splits results into purchasedProducts (status === "purchased") and
// nonPurchasedProducts (all other statuses).
buySellRouter.post("/purchase-list", async (req, res) => {
  try {
    const actor = getActor(req);
    const ownerObjectId = getActorMongoId(req);
    if (!ownerObjectId) {
      return res.status(401).json({ message: "Unauthorized user" });
    }
    const ownerIdStr = String(ownerObjectId);

    const {
      category_id,
      subcategory_id,
      status,
      country_id,
      state_id,
      city_id,
      min_price,
      max_price,
      filters = [],
    } = req.body || {};

    const filter = {};

    filter.userid = { $nin: [ownerObjectId, ownerIdStr] };

    if (category_id) {
      const id = toObjectId(category_id);
      if (id) filter.category_id = id;
    }
    if (subcategory_id) {
      const id = toObjectId(subcategory_id);
      if (id) filter.subcategory_id = id;
    }
    if (country_id) {
      const id = await resolveLocationMongoId(LocationCountry, country_id);
      if (id) filter.country_id = id;
    }
    if (state_id) {
      const id = await resolveLocationMongoId(LocationState, state_id);
      if (id) filter.state_id = id;
    }
    if (city_id) {
      const id = await resolveLocationMongoId(LocationCity, city_id);
      if (id) filter.city_id = id;
    }

    const statusValue =
      status !== undefined && status !== null ? String(status).trim() : "";
    applyListStatusFilter(
      filter,
      statusValue && statusValue.toLowerCase() !== "all" ? statusValue : null,
      undefined,
    );

    if (min_price !== undefined || max_price !== undefined) {
      filter.price = {};
      if (min_price !== undefined && min_price !== "")
        filter.price.$gte = Number(min_price);
      if (max_price !== undefined && max_price !== "")
        filter.price.$lte = Number(max_price);
    }

    const requestedSpecIds = [];

    if (Array.isArray(filters) && filters.length > 0) {
      const specConditions = filters
        .filter((f) => f.specification_id)
        .map((f) => {
          const specId = toObjectId(f.specification_id);
          if (!specId) return null;
          requestedSpecIds.push(String(f.specification_id));
          const condition = { specification_id: specId };
          if (
            Array.isArray(f.specification_value) &&
            f.specification_value.length > 0
          ) {
            condition.specification_value = { $in: f.specification_value };
          } else if (
            typeof f.specification_value === "string" &&
            f.specification_value
          ) {
            condition.specification_value = f.specification_value;
          }
          return { specifications: { $elemMatch: condition } };
        })
        .filter(Boolean);

      if (specConditions.length > 0) {
        filter.$and = [...(filter.$and || []), ...specConditions];
      }
    }

    const list = await BuySellProduct.find(filter)
      .select(LIST_PRODUCT_SELECT)
      .sort({ createdAt: -1 })
      .populate("category_id", "category_name")
      .populate("subcategory_id", "sub_category_name")
      .lean();

    const otherUsersList = list.filter(
      (item) => !item.userid || String(item.userid) !== ownerIdStr,
    );

    const trimmedList = otherUsersList.map((item) => {
      if (requestedSpecIds.length === 0) return item;
      return {
        ...item,
        specifications: (item.specifications || [])
          .filter((spec) =>
            requestedSpecIds.includes(String(spec.specification_id)),
          )
          .map((spec) => {
            const matchedFilter = filters.find(
              (f) =>
                String(f.specification_id) === String(spec.specification_id),
            );
            if (
              matchedFilter &&
              Array.isArray(matchedFilter.specification_value) &&
              matchedFilter.specification_value.length > 0
            ) {
              return matchedFilter.specification_value.includes(
                String(spec.specification_value),
              )
                ? spec
                : null;
            }
            return spec;
          })
          .filter(Boolean),
      };
    });

    const enrichedList = await enrichBuySellListItems(trimmedList, actor);

    const purchasedProducts = [];
    const nonPurchasedProducts = [];

    enrichedList.forEach((item) => {
      if (item.status === "purchased") {
        purchasedProducts.push(item);
      } else {
        nonPurchasedProducts.push(item);
      }
    });

    res.json({
      purchasedProducts: toResponseList(purchasedProducts),
      nonPurchasedProducts: toResponseList(nonPurchasedProducts),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── DELETE ───────────────────────────────────────────────────────────────────
buySellRouter.delete("/delete", async (req, res) => {
  try {
    const actor = getActor(req);
    const { ids } = req.body;
    const idList = Array.isArray(ids) ? ids : [ids];
    const resolvedIds = await resolveIdsToObjectIds(BuySellProduct, idList);

    if (!resolvedIds.length) {
      return res
        .status(400)
        .json({ message: "No valid product ids provided." });
    }

    const products = await BuySellProduct.find({ _id: { $in: resolvedIds } })
      .select("_id status userid")
      .lean();

    const blocked = products.filter((p) =>
      ["sold", "purchased", "booking"].includes(p.status),
    );
    if (blocked.length) {
      return res.status(400).json({
        message: "Cannot delete products that are booked, purchased, or sold.",
        blockedIds: blocked.map((p) => p._id),
      });
    }

    if (!isAdminActor(actor)) {
      const unauthorized = products.filter(
        (p) => p.userid && !isSameUserAsActor(p.userid, actor),
      );
      if (unauthorized.length) {
        return res.status(403).json({
          message: "You do not have permission to delete these products.",
        });
      }
    }

    const result = await BuySellProduct.deleteMany({
      _id: { $in: resolvedIds },
    });
    res.json({
      message: "Deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

function sanitizeViewSessionId(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;
  const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  return cleaned.length >= 8 ? cleaned : null;
}

// ─── INCREMENT VIEW COUNT ─────────────────────────────────────────────────────
// PATCH /api/buy-sell/:id/view
// Counts a genuine product-detail view once per user/session within 24 hours.
// Appends a MarketItemView event so dashboard time-series aggregations work.
buySellRouter.patch("/:id/view", async (req, res) => {
  try {
    const actor = getActor(req);
    const item = await findByIdOrUuid(BuySellProduct, req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });

    const productObjectId = item._id;
    const viewCount = item.viewCount || 0;

    // Admin and owner views are not marketplace engagement.
    if (actor.id && (isAdminActor(actor) || isSameUserAsActor(item.userid, actor))) {
      return res.status(200).json({
        id: item.id || String(productObjectId),
        viewCount,
        incremented: false,
      });
    }

    const userObjectId = actor.id
      ? toObjectId(actor.id) || toObjectId(actor.mongoId)
      : null;
    const sessionId = sanitizeViewSessionId(
      req.body?.sessionId || req.headers["x-view-session"],
    );

    if (!userObjectId && !sessionId) {
      return res.status(200).json({
        id: item.id || String(productObjectId),
        viewCount,
        incremented: false,
      });
    }

    const dedupeHours = 24;
    const dedupeSince = new Date(Date.now() - dedupeHours * 60 * 60 * 1000);
    const dedupeQuery = userObjectId
      ? { productId: productObjectId, userId: userObjectId, viewedAt: { $gte: dedupeSince } }
      : { productId: productObjectId, sessionId, viewedAt: { $gte: dedupeSince } };

    const recentView = await MarketItemView.findOne(dedupeQuery).select("_id").lean();
    if (recentView) {
      return res.status(200).json({
        id: item.id || String(productObjectId),
        viewCount,
        incremented: false,
      });
    }

    await MarketItemView.create({
      productId: productObjectId,
      userId: userObjectId,
      sessionId,
      viewedAt: new Date(),
    });
    const updated = await BuySellProduct.findByIdAndUpdate(
      productObjectId,
      { $inc: { viewCount: 1 } },
      { new: true },
    ).select("id viewCount");

    return res.status(200).json({
      id: item.id || String(productObjectId),
      viewCount: updated?.viewCount ?? viewCount + 1,
      incremented: true,
    });
  } catch (error) {
    if (error.code === 11000) {
      const item = await findByIdOrUuid(BuySellProduct, req.params.id);
      return res.status(200).json({
        id: item?.id,
        viewCount: item?.viewCount || 0,
        incremented: false,
      });
    }
    return res.status(500).json({ message: error.message });
  }
});

// ─── PRODUCTS BY OWNER ────────────────────────────────────────────────────────
// POST /api/buy-sell/products/owner/:ownerId
// Body: { excludeProductId?, page?, limit? }
buySellRouter.post("/products/owner/:ownerId", async (req, res) => {
  try {
    const actor = getActor(req);
    const ownerUser = await findOwnerReference(req.params.ownerId);
    if (!ownerUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const ownerUserFilter = buildBuySellUseridFilter(ownerUser);
    if (!ownerUserFilter) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const andConditions = [
      ownerUserFilter,
      { status: { $nin: SELLER_PRODUCTS_EXCLUDED_STATUSES } },
    ];

    const {
      excludeProductId,
      page: pageRaw,
      limit: limitRaw,
      country_id,
      state_id,
      city_id,
      category_id,
      subcategory_id,
    } = req.body || {};

    if (excludeProductId) {
      const excluded = await findByIdOrUuid(
        BuySellProduct,
        String(excludeProductId),
      );
      if (excluded?._id) {
        andConditions.push({ _id: { $ne: excluded._id } });
      }
    }

    // ── location filters (same resolution as /list and /purchase-list) ──
    if (country_id) {
      const id = await resolveLocationMongoId(LocationCountry, country_id);
      if (id) andConditions.push({ country_id: id });
    }
    if (state_id) {
      const id = await resolveLocationMongoId(LocationState, state_id);
      if (id) andConditions.push({ state_id: id });
    }
    if (category_id) {
      const id = toObjectId(category_id);
      if (id) andConditions.push({ category_id: id });
    }
    if (subcategory_id) {
      const id = toObjectId(subcategory_id);
      if (id) andConditions.push({ subcategory_id: id });
    }
    if (city_id) {
      const id = await resolveLocationMongoId(LocationCity, city_id);
      if (id) andConditions.push({ city_id: id });
    }

    const filter = { $and: andConditions };

    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitRaw, 10) || 12));
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      BuySellProduct.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("category_id", "category_name")
        .populate("subcategory_id", "sub_category_name")
        .lean(),
      BuySellProduct.countDocuments(filter),
    ]);

    const withLocation = await enrichBuySellProductsWithLocation(list);
    const enrichedList = await enrichBuySellListItems(withLocation, actor);

    res.json({
      success: true,
      data: {
        owner: {
          _id: ownerUser._id,
          id: ownerUser.id || null,
          name: ownerUser.name || null,
          profileImage: ownerUser.profileImage || null,
          mobile: ownerUser.mobile || null,
        },
        products: toResponseList(enrichedList),
        total,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET SINGLE (must be last — :id catches any unmatched segment) ─────────────
buySellRouter.get("/:id", async (req, res) => {
  try {
    const idParam = String(req.params.id || "").toLowerCase();
    if (RESERVED_SINGLE_SEGMENT_PATHS.has(idParam)) {
      return res.status(404).json({
        message: `Use the dedicated /api/buy-sell/${idParam} endpoint instead of GET /:id.`,
      });
    }

    const item = await findByIdOrUuid(BuySellProduct, req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });

    const data = await BuySellProduct.findById(item._id)
      .populate("category_id", "category_name")
      .populate("subcategory_id", "sub_category_name")
      .lean();

    if (!data) return res.status(404).json({ message: "Not found" });

    const response = await buildEnrichedResponse(data);

    const bitRecords = await ProductBitRecord.find({ productId: item._id })
      .sort({ createdAt: -1 })
      .lean();

    const buyerContactMap = await getUsersContactMap(
      bitRecords.map((r) => bitRecordUserId(r)),
    );

    response.bit_records = bitRecords.map((r) =>
      enrichBitRecordForResponse(r, buyerContactMap),
    );
    response.bid_count = bitRecords.length;
    response.highest_bid = bitRecords.length
      ? bitRecords.reduce(
          (max, r) => (Number(r.bit) > max ? Number(r.bit) : max),
          0,
        )
      : null;
    response.accepted_bid =
      response.bit_records.find((r) => r.status === "accepeted") || null;

    // Also resolve seller name on single-product view
    const sellerContact = contactFromMap(
      await getUsersContactMap([data.userid].filter(Boolean)),
      data.userid,
    );
    response.sellerName =
      resolvePersonName(
        sellerContact.name,
        response.sellerName,
        response.created_by,
      ) || "Seller";
    if (isPlaceholderPersonName(response.created_by)) {
      response.created_by = response.sellerName;
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = buySellRouter;