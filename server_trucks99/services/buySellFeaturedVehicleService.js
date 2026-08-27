const mongoose = require("mongoose");
const Subscription = require("../schema/Subscriptionschema");
const Transaction = require("../schema/transaction");
const BuySellProduct = require("../schema/buysellProduct");
const BuySellFeaturedVehicle = require("../schema/buySellFeaturedVehicle");
const User = require("../schema/user");
const Role = require("../schema/role");
const { findByIdOrUuid, resolveToObjectId } = require("../helpers/uuidHelper");
const { productLabel } = require("../helpers/productLabel");
const {
  notify,
  notifyMultiple,
  NOTIFICATION_EVENTS,
} = require("./notificationService");
const { sendPushToUser } = require("./fcmPushService");

const FEATURED_VEHICLE_PACKAGE_NAME = "Feature Your Vehicle";
const DEFAULT_FREE_PLAN_DURATION_DAYS = 7;
const ADMIN_FEATURED_ROUTE = "/admin/portal/buysell/featured-vehicles";

function normalizePackageName(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase();
}

function isFeaturedVehiclePackageName(packageName) {
  return (
    normalizePackageName(packageName) ===
    normalizePackageName(FEATURED_VEHICLE_PACKAGE_NAME)
  );
}

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function isMongoObjectIdString(value) {
  return /^[a-fA-F0-9]{24}$/.test(String(value || ""));
}

/** Public marketplace list: live paid placements, or Free Plan placements after admin approval. */
function liveFeaturedPlacementQuery(now = new Date()) {
  return {
    status: "active",
    expiresAt: { $gt: now },
    $nor: [{ source: "free_plan", approvedAt: null }],
  };
}

function pickPreferredFeaturedPlacement(placements) {
  if (!Array.isArray(placements) || placements.length === 0) return null;
  const nowMs = Date.now();
  const score = (placement) => {
    const status = String(placement.status || "");
    const expiresMs = placement.expiresAt
      ? new Date(placement.expiresAt).getTime()
      : 0;
    const live = status === "active" && expiresMs > nowMs;
    if (live) return 4;
    if (status === "pending") return 3;
    if (status === "rejected") return 2;
    return 1;
  };
  return [...placements].sort((a, b) => {
    const rank = score(b) - score(a);
    if (rank !== 0) return rank;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  })[0];
}

function resolveFeaturedDurationDays(catalogItem, fallback = DEFAULT_FREE_PLAN_DURATION_DAYS) {
  const days = Number(catalogItem?.durationDays);
  if (Number.isFinite(days) && days > 0) return days;
  const fallbackDays = Number(fallback);
  return Number.isFinite(fallbackDays) && fallbackDays > 0
    ? fallbackDays
    : DEFAULT_FREE_PLAN_DURATION_DAYS;
}

function buildFeaturedPublicMeta(placement) {
  if (!placement) return null;
  const nowMs = Date.now();
  const status = String(placement.status || "");
  const expiresMs = placement.expiresAt
    ? new Date(placement.expiresAt).getTime()
    : 0;
  const remainingDays =
    expiresMs > nowMs
      ? Math.ceil((expiresMs - nowMs) / (1000 * 60 * 60 * 24))
      : 0;

  let expiryStatus = "Expired";
  if (status === "pending") expiryStatus = "Pending Approval";
  else if (status === "rejected") expiryStatus = "Rejected";
  else if (status === "cancelled") expiryStatus = "Cancelled";
  else if (status === "active" && expiresMs > nowMs) {
    expiryStatus = remainingDays <= 3 ? "Expiring Soon" : "Active";
  }

  const requester =
    placement.userId && typeof placement.userId === "object"
      ? {
          _id: placement.userId._id,
          name: placement.userId.name || "",
          email: placement.userId.email || "",
          mobile: placement.userId.mobile || "",
        }
      : null;

  return {
    featuredPlacementId: placement._id,
    packageId: placement.packageId,
    packageName: placement.packageName,
    packageType: placement.packageType,
    price: placement.price,
    paymentAmount: Number(placement.price || 0),
    durationDays: placement.durationDays,
    paymentId: placement.paymentId,
    orderId: placement.orderId,
    source: placement.source || (Number(placement.price) === 0 ? "free_plan" : "paid"),
    featuredStatus: placement.status,
    featuredAt: placement.createdAt,
    featuredStartDate: placement.approvedAt || placement.createdAt,
    expiresAt: placement.expiresAt,
    featuredEndDate: placement.expiresAt,
    remainingDays: status === "pending" ? null : remainingDays,
    expiryStatus,
    approvedBy: placement.approvedBy || null,
    approvedAt: placement.approvedAt || null,
    rejectedBy: placement.rejectedBy || null,
    rejectedAt: placement.rejectedAt || null,
    rejectionReason: placement.rejectionReason || "",
    requester,
  };
}

function isLiveFeaturedPlacement(placementOrMeta) {
  if (!placementOrMeta) return false;
  const status = String(
    placementOrMeta.status || placementOrMeta.featuredStatus || "",
  );
  if (status !== "active") return false;
  const expiryStatus = placementOrMeta.expiryStatus;
  if (expiryStatus === "Pending Approval" || expiryStatus === "Rejected") {
    return false;
  }
  const source = placementOrMeta.source;
  if (source === "free_plan" && !placementOrMeta.approvedAt) {
    return false;
  }
  const expiresAt = placementOrMeta.expiresAt || placementOrMeta.featuredEndDate;
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() > Date.now();
}

async function findSubscriptionItemById(subscriptionItemId) {
  if (!subscriptionItemId) return null;
  const doc = await Subscription.findOne({
    "subscriptions.id": subscriptionItemId,
  }).lean();
  if (!doc?.subscriptions?.length) return null;
  return (
    doc.subscriptions.find((item) => item.id === subscriptionItemId) || null
  );
}

async function resolveBuySellProduct(productId) {
  if (!productId) return null;
  return findByIdOrUuid(BuySellProduct, productId);
}

function productOwnerId(product) {
  if (!product?.userid) return null;
  return String(product.userid);
}

function actorMatchesProductOwner(actor, product) {
  if (!actor?.id || !product) return false;
  const ownerId = productOwnerId(product);
  if (!ownerId) return false;
  const actorIds = new Set(
    [actor.id, actor.mongoId, actor.customId]
      .filter(Boolean)
      .map((v) => String(v).toLowerCase()),
  );
  return actorIds.has(ownerId.toLowerCase());
}

function roleLooksLikeAdmin(role) {
  if (!role) return false;
  const n = String(
    typeof role === "string" ? role : role.name || role.status || "",
  ).toLowerCase();
  return (
    n === "admin" ||
    n === "super admin" ||
    n === "super_admin" ||
    n === "superadmin" ||
    n.includes("admin")
  );
}

async function findAdminUserIds() {
  const roles = await Role.find({
    $or: [{ status: "admin" }, { name: { $regex: /admin/i } }],
  })
    .select("_id")
    .lean();
  const roleIds = roles.map((r) => r._id);
  const users = await User.find({
    $or: [
      { email: /^admin@mail\.com$/i },
      ...(roleIds.length ? [{ roleId: { $in: roleIds } }] : []),
    ],
  })
    .select("_id")
    .lean();

  const ids = new Set(users.map((u) => String(u._id)));
  if (ids.size) return [...ids];

  const populated = await User.find({ roleId: { $ne: null } })
    .populate("roleId", "name status")
    .select("_id roleId")
    .lean();
  for (const user of populated) {
    if (roleLooksLikeAdmin(user.roleId)) ids.add(String(user._id));
  }
  return [...ids];
}

async function notifyAdminsOfFreePlanRequest({
  seller,
  product,
  placement,
}) {
  const adminIds = await findAdminUserIds();
  const sellerId = seller?._id ? String(seller._id) : "";
  let recipients = sellerId
    ? adminIds.filter((id) => id !== sellerId)
    : adminIds;
  if (!recipients.length) {
    recipients = adminIds;
  }
  if (!recipients.length) {
    console.error(
      "[Featured] no admin users found to notify for Free Plan request",
      String(placement?._id || ""),
    );
    return;
  }
  const productName = productLabel(product);
  const sellerName = seller?.name || "A seller";
  await notifyMultiple(recipients, {
    event: NOTIFICATION_EVENTS.FEATURED_FREE_PLAN_REQUEST,
    data: {
      userName: "Admin",
      sellerName,
      sellerMobile: seller?.mobile || "—",
      productName,
      requestStatus: "pending",
    },
    metadata: {
      productId: String(product._id),
      placementId: String(placement._id),
      requestId: String(placement._id),
      requestStatus: "pending",
      source: "free_plan",
      audience: "admin",
      route: ADMIN_FEATURED_ROUTE,
      postType: "PRODUCT",
      senderId: seller?._id || undefined,
    },
    channelsOverride: ["in_app", "push"],
    dedupeKey: `featured-free-plan:${placement._id}`,
  }).catch((err) => {
    console.error("[Featured] admin free-plan notification failed:", err.message);
  });
}

function actorMongoId(actor) {
  const candidates = [actor?.mongoId, actor?.id];
  for (const value of candidates) {
    if (isMongoObjectIdString(value)) return value;
  }
  return null;
}

async function resolveSellerMongoId(actor, product) {
  const fromActor = actorMongoId(actor);
  if (fromActor) return fromActor;

  const ownerRaw = product?.userid;
  if (isMongoObjectIdString(ownerRaw)) return ownerRaw;

  const resolved =
    (await resolveToObjectId(User, ownerRaw)) ||
    (await resolveToObjectId(User, actor?.customId || actor?.id));
  return resolved || null;
}

async function collapseDuplicatePendingFreePlans(productId) {
  if (!productId) return null;
  const pending = await BuySellFeaturedVehicle.find({
    productId,
    source: "free_plan",
    status: "pending",
  }).sort({ createdAt: 1 });
  if (pending.length <= 1) return pending[0] || null;
  const keep = pending[pending.length - 1];
  const duplicateIds = pending.slice(0, -1).map((row) => row._id);
  await BuySellFeaturedVehicle.updateMany(
    { _id: { $in: duplicateIds } },
    {
      $set: {
        status: "cancelled",
        rejectionReason: "Duplicate pending Free Plan request",
      },
    },
  );
  return keep;
}

async function notifySellerFreePlanDecision({
  sellerId,
  product,
  placement,
  approved,
  rejectionReason,
}) {
  const fallbackSellerId = sellerId || product?.userid;
  if (!fallbackSellerId) {
    console.warn("[Featured] SKIP seller notify — missing sellerId");
    return;
  }

  const seller =
    (await User.findById(fallbackSellerId).select("name").lean().catch(() => null)) ||
    (await User.findOne({ id: String(fallbackSellerId) }).select("_id name").lean());
  const resolvedSellerId = seller?._id || fallbackSellerId;
  const productName = productLabel(product);
  const expiryDate = placement.expiresAt
    ? new Date(placement.expiresAt).toLocaleDateString("en-IN")
    : "—";
  const event = approved
    ? NOTIFICATION_EVENTS.FEATURED_FREE_PLAN_APPROVED
    : NOTIFICATION_EVENTS.FEATURED_FREE_PLAN_REJECTED;
  const route = `/viewproduct/${product._id}`;
  const title = approved ? "Free Plan approved" : "Free Plan request declined";
  const body = approved
    ? `${productName} is now featured on TRUCKS99 until ${expiryDate}.`
    : `Your Free Plan request for ${productName} was not approved.${
        rejectionReason ? ` ${rejectionReason}` : ""
      }`;

  console.log("[FCM][Featured] seller decision →", {
    event,
    sellerId: String(resolvedSellerId),
    productId: String(product._id),
    placementId: String(placement._id),
    approved,
  });

  const result = await notify({
    userId: resolvedSellerId,
    event,
    data: {
      userName: seller?.name || "User",
      productName,
      expiryDate,
      rejectionReason: rejectionReason || "",
    },
    metadata: {
      productId: String(product._id),
      placementId: String(placement._id),
      requestId: String(placement._id),
      requestStatus: approved ? "approved" : "rejected",
      status: approved ? "approved" : "rejected",
      source: "free_plan",
      route,
      postType: "PRODUCT",
      entityType: "PRODUCT",
      entityId: String(product._id),
      fcmType: event,
      ownerId: String(resolvedSellerId),
    },
    channelsOverride: ["in_app", "push"],
  }).catch((err) => {
    console.error("[Featured] seller free-plan notification failed:", err.message);
    return null;
  });

  const push = result?.results?.channels?.push;
  console.log("[FCM][Featured] seller notify result →", {
    event,
    sellerId: String(resolvedSellerId),
    ok: result?.ok,
    skipped: result?.skipped,
    skipReason: result?.reason,
    pushSent: push?.sent ?? null,
    pushError: push?.error || null,
    deviceCount: push?.deviceCount ?? null,
  });

  if (push?.sent) return;

  const fallback = await sendPushToUser(resolvedSellerId, title, body, {
    type: event,
    productId: String(product._id),
    postId: String(product._id),
    requestId: String(placement._id),
    postType: "PRODUCT",
    entityType: "PRODUCT",
    status: approved ? "approved" : "rejected",
    route,
    ownerId: String(resolvedSellerId),
  }).catch((err) => {
    console.error("[FCM][Featured] seller Firebase fallback failed:", err.message);
    return null;
  });

  console.log("[FCM][Featured] seller Firebase fallback →", {
    event,
    sellerId: String(resolvedSellerId),
    sent: fallback?.sent ?? false,
    error: fallback?.error || null,
  });
}

/**
 * Create or return existing featured placement after a verified payment.
 * Idempotent on paymentId / orderId.
 */
async function activateFeaturedVehicleFromPayment({
  actor,
  userId,
  productId,
  orderId,
  paymentId,
  subscriptionItemId,
  clientPackageName,
}) {
  const orderIdStr = orderId ? String(orderId) : null;
  const paymentIdStr = paymentId ? String(paymentId) : null;

  if (!productId) {
    throw httpError("productId is required to feature a vehicle", 400);
  }
  if (!orderIdStr && !paymentIdStr) {
    throw httpError("orderId or paymentId is required", 400);
  }

  if (paymentIdStr) {
    const existing = await BuySellFeaturedVehicle.findOne({
      paymentId: paymentIdStr,
    }).lean();
    if (existing) return { record: existing, created: false, duplicate: true };
  }
  if (orderIdStr) {
    const existing = await BuySellFeaturedVehicle.findOne({
      orderId: orderIdStr,
    }).lean();
    if (existing) return { record: existing, created: false, duplicate: true };
  }

  let tx = null;
  if (orderIdStr) {
    tx = await Transaction.findOne({ orderId: orderIdStr }).lean();
  }
  if (!tx && paymentIdStr) {
    tx = await Transaction.findOne({ paymentId: paymentIdStr }).lean();
  }
  if (!tx) {
    throw httpError("Payment transaction not found", 404);
  }
  if (tx.status !== "success") {
    throw httpError("Payment has not been verified as successful", 400);
  }

  const pkgId = subscriptionItemId || tx.packageId;
  const catalogItem = await findSubscriptionItemById(pkgId);
  if (!catalogItem) {
    throw httpError("Subscription package not found in catalog", 400);
  }
  if (catalogItem.status !== "active") {
    throw httpError("Subscription package is not active", 400);
  }
  if (!isFeaturedVehiclePackageName(catalogItem.packageName)) {
    throw httpError(
      "This payment is not for a Feature Your Vehicle package",
      400,
    );
  }
  if (
    clientPackageName &&
    !isFeaturedVehiclePackageName(clientPackageName)
  ) {
    throw httpError("Invalid featured vehicle package", 400);
  }
  if (String(tx.packageId) !== String(catalogItem.id)) {
    throw httpError("Transaction package does not match catalog item", 400);
  }

  const txUserId = tx.userId ? String(tx.userId) : "";
  const finalUserId = String(userId || actor?.id || "");
  if (txUserId && finalUserId && txUserId !== finalUserId) {
    throw httpError("Payment does not belong to this user", 403);
  }

  const product = await resolveBuySellProduct(productId);
  if (!product) {
    throw httpError("Buy & Sell product not found", 404);
  }
  if (actor && !actorMatchesProductOwner(actor, product)) {
    throw httpError("You can only feature your own listings", 403);
  }

  const ownerMongoId = product.userid;
  if (txUserId && ownerMongoId && String(ownerMongoId) !== txUserId) {
    throw httpError("Product owner does not match payment user", 403);
  }

  const durationDays = resolveFeaturedDurationDays(catalogItem, tx.packageDuration);
  const startDate = new Date();
  const expiresAt = new Date(startDate);
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  const resolvedPaymentId =
    paymentIdStr || tx.paymentId || tx.razorpayResponse?.razorpay_payment_id;
  const resolvedOrderId =
    orderIdStr || tx.orderId || tx.razorpayResponse?.razorpay_order_id;

  try {
    const record = await BuySellFeaturedVehicle.create({
      productId: product._id,
      productUuid: product.id || null,
      userId: ownerMongoId,
      packageId: catalogItem.id,
      packageName: catalogItem.packageName,
      packageType: catalogItem.packageType || "",
      price: Number(catalogItem.price ?? tx.price ?? 0),
      durationDays,
      paymentId: resolvedPaymentId || null,
      orderId: resolvedOrderId || null,
      source: "paid",
      status: "active",
      expiresAt,
    });

    await BuySellFeaturedVehicle.updateMany(
      {
        _id: { $ne: record._id },
        productId: product._id,
        source: "free_plan",
        status: "pending",
      },
      {
        $set: {
          status: "cancelled",
          rejectionReason: "Superseded by a paid featured plan",
        },
      },
    );

    return { record: record.toObject(), created: true, duplicate: false };
  } catch (createErr) {
    if (createErr?.code === 11000) {
      const dup = await BuySellFeaturedVehicle.findOne({
        $or: [
          resolvedPaymentId ? { paymentId: resolvedPaymentId } : null,
          resolvedOrderId ? { orderId: resolvedOrderId } : null,
        ].filter(Boolean),
      }).lean();
      if (dup) return { record: dup, created: false, duplicate: true };
    }
    throw createErr;
  }
}

async function requestFreePlanFeaturedVehicle({
  actor,
  productId,
  subscriptionItemId,
  clientPackageName,
}) {
  if (!actor?.id) {
    throw httpError("Authentication required to request a Free Plan", 401);
  }
  if (!productId) {
    throw httpError("productId is required", 400);
  }
  if (!subscriptionItemId) {
    throw httpError("subscriptionItemId is required", 400);
  }

  const catalogItem = await findSubscriptionItemById(subscriptionItemId);
  if (!catalogItem) {
    throw httpError("Subscription package not found in catalog", 400);
  }
  if (catalogItem.status !== "active") {
    throw httpError("Subscription package is not active", 400);
  }
  if (!isFeaturedVehiclePackageName(catalogItem.packageName)) {
    throw httpError("This package is not a Feature Your Vehicle plan", 400);
  }
  if (clientPackageName && !isFeaturedVehiclePackageName(clientPackageName)) {
    throw httpError("Invalid featured vehicle package", 400);
  }
  if (Number(catalogItem.price) !== 0) {
    throw httpError("This endpoint is only for the Free Plan", 400);
  }

  const product = await resolveBuySellProduct(productId);
  if (!product) {
    throw httpError("Buy & Sell product not found", 404);
  }
  if (!actorMatchesProductOwner(actor, product)) {
    throw httpError("You can only feature your own listings", 403);
  }

  const terminal = ["sold", "purchased", "booking", "rejected"];
  if (terminal.includes(String(product.status || "").toLowerCase())) {
    throw httpError("This listing cannot be featured in its current status", 400);
  }

  const now = new Date();
  const existingLive = await BuySellFeaturedVehicle.findOne({
    productId: product._id,
    status: "active",
    expiresAt: { $gt: now },
  }).lean();
  if (existingLive) {
    throw httpError("This vehicle is already featured", 409);
  }

  const existingPending = await collapseDuplicatePendingFreePlans(product._id);
  if (existingPending) {
    return {
      record: existingPending.toObject
        ? existingPending.toObject()
        : existingPending,
      created: false,
      duplicate: true,
    };
  }

  const sellerMongoId = await resolveSellerMongoId(actor, product);
  if (!sellerMongoId) {
    throw httpError("Could not resolve the logged-in user for this request", 400);
  }
  if (!product._id) {
    throw httpError("Vehicle ID is missing on this listing", 400);
  }

  const durationDays = resolveFeaturedDurationDays(catalogItem);
  let record;
  try {
    record = await BuySellFeaturedVehicle.create({
      productId: product._id,
      productUuid: product.id || null,
      userId: sellerMongoId,
      packageId: catalogItem.id,
      packageName: catalogItem.packageName,
      packageType: catalogItem.packageType || "agent",
      price: 0,
      durationDays,
      paymentId: null,
      orderId: null,
      source: "free_plan",
      status: "pending",
      expiresAt: null,
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: "",
    });
  } catch (createErr) {
    if (createErr?.code === 11000) {
      const dup = await BuySellFeaturedVehicle.findOne({
        productId: product._id,
        status: "pending",
        source: "free_plan",
      }).sort({ createdAt: -1 });
      if (dup) {
        return {
          record: dup.toObject(),
          created: false,
          duplicate: true,
        };
      }
    }
    throw createErr;
  }

  const seller = await User.findById(sellerMongoId)
    .select("name email mobile")
    .lean();

  await notifyAdminsOfFreePlanRequest({
    seller,
    product,
    placement: record,
  });

  return { record: record.toObject(), created: true, duplicate: false };
}

async function approveFreePlanFeaturedVehicle({
  actor,
  placementId,
}) {
  if (!placementId) {
    throw httpError("placementId is required", 400);
  }

  const placement = await BuySellFeaturedVehicle.findById(placementId);
  if (!placement) {
    throw httpError("Featured request not found", 404);
  }
  if (placement.source !== "free_plan") {
    throw httpError("Only Free Plan requests can be approved this way", 400);
  }
  if (placement.status === "active" && isLiveFeaturedPlacement(placement.toObject())) {
    return { record: placement.toObject(), alreadyApproved: true };
  }
  if (placement.status === "rejected") {
    throw httpError(
      "This Free Plan request was rejected and cannot be approved",
      400,
    );
  }
  if (placement.status !== "pending") {
    throw httpError(
      `This Free Plan request cannot be approved from status "${placement.status}"`,
      400,
    );
  }

  const product = await BuySellProduct.findById(placement.productId).lean();
  if (!product) {
    throw httpError("Buy & Sell product not found", 404);
  }

  const now = new Date();
  const existingLive = await BuySellFeaturedVehicle.findOne({
    _id: { $ne: placement._id },
    productId: placement.productId,
    ...liveFeaturedPlacementQuery(now),
  }).lean();
  if (existingLive) {
    throw httpError(
      "This vehicle is already featured. Duplicate featured records are not allowed.",
      409,
    );
  }

  const catalogItem = await findSubscriptionItemById(placement.packageId);
  const durationDays = resolveFeaturedDurationDays({
    durationDays: catalogItem?.durationDays || placement.durationDays,
  });
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  const updated = await BuySellFeaturedVehicle.findOneAndUpdate(
    {
      _id: placement._id,
      source: "free_plan",
      status: "pending",
    },
    {
      $set: {
        status: "active",
        durationDays,
        expiresAt,
        approvedBy: actorMongoId(actor),
        approvedAt: now,
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: "",
      },
    },
    { new: true },
  );

  if (!updated) {
    const latest = await BuySellFeaturedVehicle.findById(placementId);
    if (
      latest?.status === "active" &&
      isLiveFeaturedPlacement(latest.toObject())
    ) {
      return { record: latest.toObject(), alreadyApproved: true };
    }
    throw httpError("This Free Plan request is no longer pending", 409);
  }

  await BuySellFeaturedVehicle.updateMany(
    {
      _id: { $ne: updated._id },
      productId: updated.productId,
      source: "free_plan",
      status: "pending",
    },
    {
      $set: {
        status: "cancelled",
        rejectionReason: "Superseded by an approved Free Plan request",
      },
    },
  );

  await notifySellerFreePlanDecision({
    sellerId: updated.userId,
    product,
    placement: updated,
    approved: true,
  });

  return { record: updated.toObject(), alreadyApproved: false };
}

async function makeFeaturedVehicleAdmin({ actor, productId }) {
  if (!productId) {
    throw httpError("productId is required", 400);
  }

  const product = await resolveBuySellProduct(productId);
  if (!product) {
    throw httpError("Buy & Sell product not found", 404);
  }

  const terminal = ["sold", "purchased", "booking", "rejected"];
  if (terminal.includes(String(product.status || "").toLowerCase())) {
    throw httpError("This listing cannot be featured in its current status", 400);
  }

  const now = new Date();
  const existingLive = await BuySellFeaturedVehicle.findOne({
    productId: product._id,
    ...liveFeaturedPlacementQuery(now),
  }).lean();
  if (existingLive) {
    throw httpError("This vehicle is already featured", 409);
  }

  const pendingRequest = await BuySellFeaturedVehicle.findOne({
    productId: product._id,
    source: "free_plan",
    status: "pending",
  }).sort({ createdAt: -1 });
  if (pendingRequest) {
    return approveFreePlanFeaturedVehicle({
      actor,
      placementId: pendingRequest._id,
    });
  }

  const ownerMongoId = await resolveSellerMongoId(null, product);
  if (!ownerMongoId) {
    throw httpError("Could not resolve the vehicle owner", 400);
  }

  const catalog = await Subscription.findOne({
    subscriptions: {
      $elemMatch: {
        packageName: { $regex: /^Feature Your Vehicle$/i },
        price: 0,
        status: "active",
      },
    },
  }).lean();
  const catalogItem = catalog?.subscriptions?.find(
    (item) =>
      isFeaturedVehiclePackageName(item.packageName) &&
      Number(item.price) === 0 &&
      item.status === "active",
  );
  const durationDays = resolveFeaturedDurationDays(catalogItem);
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  const record = await BuySellFeaturedVehicle.create({
    productId: product._id,
    productUuid: product.id || null,
    userId: ownerMongoId,
    packageId: catalogItem?.id || "admin-featured-vehicle",
    packageName: catalogItem?.packageName || FEATURED_VEHICLE_PACKAGE_NAME,
    packageType: catalogItem?.packageType || "admin",
    price: 0,
    durationDays,
    paymentId: null,
    orderId: null,
    source: "free_plan",
    status: "active",
    expiresAt,
    approvedBy: actorMongoId(actor),
    approvedAt: now,
  });

  return { record: record.toObject(), created: true, duplicate: false };
}

async function rejectFreePlanFeaturedVehicle({
  actor,
  placementId,
  reason,
}) {
  if (!placementId) {
    throw httpError("placementId is required", 400);
  }

  const placement = await BuySellFeaturedVehicle.findById(placementId);
  if (!placement) {
    throw httpError("Featured request not found", 404);
  }
  if (placement.source !== "free_plan") {
    throw httpError("Only Free Plan requests can be rejected this way", 400);
  }
  if (placement.status === "rejected") {
    return { record: placement.toObject(), alreadyRejected: true };
  }
  if (placement.status !== "pending") {
    throw httpError(
      `This Free Plan request cannot be rejected from status "${placement.status}"`,
      400,
    );
  }

  const product = await BuySellProduct.findById(placement.productId).lean();

  placement.status = "rejected";
  placement.rejectedBy = actorMongoId(actor);
  placement.rejectedAt = new Date();
  placement.rejectionReason = String(reason || "").trim();
  await placement.save();

  if (product) {
    await notifySellerFreePlanDecision({
      sellerId: placement.userId,
      product,
      placement,
      approved: false,
      rejectionReason: placement.rejectionReason,
    });
  }

  return { record: placement.toObject() };
}

async function updateFeaturedPlacementAdminStatus({
  actor,
  placementId,
  status,
  reason,
}) {
  const next = String(status || "").toLowerCase();
  if (!placementId) {
    throw httpError("placementId is required", 400);
  }

  if (next === "approved") {
    return approveFreePlanFeaturedVehicle({ actor, placementId });
  }
  if (next === "rejected") {
    return rejectFreePlanFeaturedVehicle({ actor, placementId, reason });
  }

  const placement = await BuySellFeaturedVehicle.findById(placementId);
  if (!placement) {
    throw httpError("Featured placement not found", 404);
  }

  if (next === "active") {
    if (placement.status === "pending") {
      return approveFreePlanFeaturedVehicle({ actor, placementId });
    }
    if (!placement.expiresAt || new Date(placement.expiresAt) <= new Date()) {
      const durationDays = resolveFeaturedDurationDays(placement);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);
      placement.expiresAt = expiresAt;
      placement.durationDays = durationDays;
    }
    placement.status = "active";
    await placement.save();
    return { record: placement.toObject() };
  }

  if (next === "cancelled") {
    if (placement.status === "pending") {
      return rejectFreePlanFeaturedVehicle({ actor, placementId, reason });
    }
    placement.status = "cancelled";
    await placement.save();
    return { record: placement.toObject() };
  }

  throw httpError("Unsupported status. Use approved, rejected, active, or cancelled.", 400);
}

async function removeFeaturedPlacementAdmin(placementId) {
  if (!placementId) {
    throw httpError("placementId is required", 400);
  }
  const deleted = await BuySellFeaturedVehicle.findByIdAndDelete(placementId);
  if (!deleted) {
    throw httpError("Featured placement not found", 404);
  }
  return { record: deleted.toObject() };
}

async function expireStaleFeaturedRecords() {
  await BuySellFeaturedVehicle.updateMany(
    { status: "active", expiresAt: { $lte: new Date() } },
    { $set: { status: "expired" } },
  );
}

module.exports = {
  FEATURED_VEHICLE_PACKAGE_NAME,
  DEFAULT_FREE_PLAN_DURATION_DAYS,
  isFeaturedVehiclePackageName,
  findSubscriptionItemById,
  activateFeaturedVehicleFromPayment,
  requestFreePlanFeaturedVehicle,
  makeFeaturedVehicleAdmin,
  approveFreePlanFeaturedVehicle,
  rejectFreePlanFeaturedVehicle,
  updateFeaturedPlacementAdminStatus,
  removeFeaturedPlacementAdmin,
  expireStaleFeaturedRecords,
  buildFeaturedPublicMeta,
  isLiveFeaturedPlacement,
  liveFeaturedPlacementQuery,
  pickPreferredFeaturedPlacement,
};
