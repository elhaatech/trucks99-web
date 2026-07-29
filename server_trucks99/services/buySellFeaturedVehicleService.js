const mongoose = require("mongoose");
const Subscription = require("../schema/Subscriptionschema");
const Transaction = require("../schema/transaction");
const BuySellProduct = require("../schema/buysellProduct");
const BuySellFeaturedVehicle = require("../schema/buySellFeaturedVehicle");
const { findByIdOrUuid } = require("../helpers/uuidHelper");

const FEATURED_VEHICLE_PACKAGE_NAME = "Feature Your Vehicle";

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
    const err = new Error("productId is required to feature a vehicle");
    err.statusCode = 400;
    throw err;
  }
  if (!orderIdStr && !paymentIdStr) {
    const err = new Error("orderId or paymentId is required");
    err.statusCode = 400;
    throw err;
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
    const err = new Error("Payment transaction not found");
    err.statusCode = 404;
    throw err;
  }
  if (tx.status !== "success") {
    const err = new Error("Payment has not been verified as successful");
    err.statusCode = 400;
    throw err;
  }

  const pkgId = subscriptionItemId || tx.packageId;
  const catalogItem = await findSubscriptionItemById(pkgId);
  if (!catalogItem) {
    const err = new Error("Subscription package not found in catalog");
    err.statusCode = 400;
    throw err;
  }
  if (catalogItem.status !== "active") {
    const err = new Error("Subscription package is not active");
    err.statusCode = 400;
    throw err;
  }
  if (!isFeaturedVehiclePackageName(catalogItem.packageName)) {
    const err = new Error(
      "This payment is not for a Feature Your Vehicle package",
    );
    err.statusCode = 400;
    throw err;
  }
  if (
    clientPackageName &&
    !isFeaturedVehiclePackageName(clientPackageName)
  ) {
    const err = new Error("Invalid featured vehicle package");
    err.statusCode = 400;
    throw err;
  }
  if (String(tx.packageId) !== String(catalogItem.id)) {
    const err = new Error("Transaction package does not match catalog item");
    err.statusCode = 400;
    throw err;
  }

  const txUserId = tx.userId ? String(tx.userId) : "";
  const finalUserId = String(userId || actor?.id || "");
  if (txUserId && finalUserId && txUserId !== finalUserId) {
    const err = new Error("Payment does not belong to this user");
    err.statusCode = 403;
    throw err;
  }

  const product = await resolveBuySellProduct(productId);
  if (!product) {
    const err = new Error("Buy & Sell product not found");
    err.statusCode = 404;
    throw err;
  }
  if (actor && !actorMatchesProductOwner(actor, product)) {
    const err = new Error("You can only feature your own listings");
    err.statusCode = 403;
    throw err;
  }

  const ownerMongoId = product.userid;
  if (txUserId && ownerMongoId && String(ownerMongoId) !== txUserId) {
    const err = new Error("Product owner does not match payment user");
    err.statusCode = 403;
    throw err;
  }

  const startDate = new Date();
  const expiresAt = new Date(startDate);
  expiresAt.setDate(
    expiresAt.getDate() + Number(catalogItem.durationDays || tx.packageDuration || 0),
  );

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
      durationDays: Number(catalogItem.durationDays ?? tx.packageDuration ?? 0),
      paymentId: resolvedPaymentId || null,
      orderId: resolvedOrderId || null,
      status: "active",
      expiresAt,
    });

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

async function expireStaleFeaturedRecords() {
  await BuySellFeaturedVehicle.updateMany(
    { status: "active", expiresAt: { $lte: new Date() } },
    { $set: { status: "expired" } },
  );
}

module.exports = {
  FEATURED_VEHICLE_PACKAGE_NAME,
  isFeaturedVehiclePackageName,
  findSubscriptionItemById,
  activateFeaturedVehicleFromPayment,
  expireStaleFeaturedRecords,
};
