const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const mongoose = require("mongoose");
const Log = require("../schema/log");
const User = require("../schema/user");
const UserSubscription = require("../schema/usersubscriptionschema");
const Transaction = require("../schema/transaction");
const { enrichSubscriptions } = require("../services/Subscriptionenricher");
const IncomeExpense = require("../schema/incomeExpense");
const IncomeExpenseCategory = require("../schema/incomeExpenseCategory");
const {
  notify,
  NOTIFICATION_EVENTS,
} = require("../services/notificationService");
const {
  isFeaturedVehiclePackageName,
  findSubscriptionItemById,
  activateFeaturedVehicleFromPayment,
} = require("../services/buySellFeaturedVehicleService");
const paymentRouter = express.Router();

// ── Razorpay instance (lazy – created on first use so env vars are available) ─
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

// ── Helper: Validate and convert fieldName to schema enum ─────────────────────
function normalizeFieldName(fieldName) {
  if (!fieldName) return "product"; // default

  const normalized = String(fieldName).toLowerCase().trim();

  // Map old frontend values to schema enum values
  const fieldNameMap = {
    match_load: "load",
    match_truck: "truck",
    agent: "product",
    dashboard: "product",
    load: "load",
    truck: "truck",
    product: "product",
  };

  const result = fieldNameMap[normalized] || "product";
  console.log(`[fieldName] Converted "${fieldName}" → "${result}"`);
  return result;
}

// ── Helper: Build flexible userId query (handles both string and ObjectId) ───
function buildUserIdQuery(userId) {
  if (!userId) return { userId: null };

  const userIdStr = String(userId);
  const queries = [
    { userId: userIdStr }, // Try as string
  ];

  // Also try as ObjectId if valid
  if (mongoose.Types.ObjectId.isValid(userIdStr)) {
    queries.push({ userId: new mongoose.Types.ObjectId(userIdStr) });
  }

  // If only one query, return it directly
  if (queries.length === 1) return queries[0];

  // Otherwise return $or query
  return { $or: queries };
}

// ── POST /api/payment/create-order ──────────────────────────────────────────
paymentRouter.post("/create-order", async (req, res) => {
  try {
    const {
      amount,
      currency = "INR",
      subscriptionItemId,
      fieldName,
      packageName,
      durationDays,
      buySellProductId,
      productId,
      user,
      requestingUser,
      userId, // Support passing userId directly in payload
    } = req.body;

    const linkedProductId = buySellProductId || productId || null;

    const actor = user || requestingUser || req.user || {};
    const finalUserId = String(userId || actor?._id || actor?.id || "");
    const normalizedFieldName = normalizeFieldName(fieldName); // ✅ VALIDATE

    if (!amount || isNaN(Number(amount))) {
      return res.status(400).json({ message: "amount is required" });
    }
    if (!subscriptionItemId) {
      return res
        .status(400)
        .json({ message: "subscriptionItemId is required" });
    }

    const receipt = `rcpt_${subscriptionItemId}_${Date.now()}`.slice(0, 40);

    const order = await getRazorpay().orders.create({
      amount: Math.round(Number(amount) * 100),
      currency,
      receipt,
      notes: {
        subscriptionItemId,
        fieldName: normalizedFieldName, // ✅ USE NORMALIZED VALUE
        packageName: packageName || "",
        durationDays: String(durationDays || ""),
        userId: finalUserId,
        buySellProductId: linkedProductId ? String(linkedProductId) : "",
      },
    });

    await new Log({
      name: actor?.name || "unknown",
      email: actor?.mobile || "",
      role: actor?.role || "",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `created Razorpay order ${order.id} for subscription item ${subscriptionItemId} (₹${amount})`,
    }).save();

    await new Transaction({
      orderId: order.id,
      userId: finalUserId,
      packageId: subscriptionItemId,
      packageDuration: Number(durationDays || 0),
      price: Number(amount),
      status: "created",
      buySellProductId: linkedProductId ? String(linkedProductId) : null,
      orderDetails: order,
    }).save();

    res.status(201).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_T2J2vGFVIw0xpl",
    });
  } catch (error) {
    console.error("[Payment] create-order error:", error);
    res.status(500).json({
      message: "Error creating payment order",
      error: error?.message || String(error),
    });
  }
});

// ── POST /api/payment/verify ─────────────────────────────────────────────────
paymentRouter.post("/verify", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      subscriptionItemId,
      fieldName,
      packageName,
      packageType,
      durationDays,
      price,
      autoPay,
      buySellProductId,
      productId,
      user,
      requestingUser,
      userId, // Extract userId directly
    } = req.body;

    const linkedProductId = buySellProductId || productId || null;

    const actor = user || requestingUser || req.user || {};
    const finalUserId = String(userId || actor?._id || actor?.id || "");
    const normalizedFieldName = normalizeFieldName(fieldName); // ✅ VALIDATE

    // ── 1. Verify HMAC signature ─────────────────────────────────────────────
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET || "OO8ZuWKdDAdJ2mS8OJMpukAb",
      )
      .update(body)
      .digest("hex");

    const existingTx = await Transaction.findOne({
      orderId: razorpay_order_id,
    }).lean();

    if (expectedSignature !== razorpay_signature) {
      await Transaction.findOneAndUpdate(
        { orderId: razorpay_order_id },
        {
          status: "failed",
          errorDetails: "invalid signature",
          updatedAt: Date.now(),
        },
      );
      return res
        .status(400)
        .json({ message: "Payment verification failed: invalid signature" });
    }

    const paymentAlreadyVerified = existingTx?.status === "success";

    // ── 2. Fetch full payment details from Razorpay ──────────────────────────
    let paymentDetailsData = null;
    try {
      paymentDetailsData =
        await getRazorpay().payments.fetch(razorpay_payment_id);
    } catch (err) {
      console.error(
        "Failed to fetch payment details from Razorpay:",
        err?.message,
      );
    }

    // Build update payload for Transaction
    const txUpdatePayload = {
      status: "success",
      paymentId: razorpay_payment_id,
      razorpayResponse: {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      },
      updatedAt: Date.now(),
    };

    // Only store paymentDetails if fetch succeeded
    if (paymentDetailsData && typeof paymentDetailsData === "object") {
      txUpdatePayload.paymentDetails = paymentDetailsData;
    }

    await Transaction.findOneAndUpdate(
      { orderId: razorpay_order_id },
      {
        ...txUpdatePayload,
        ...(linkedProductId
          ? { buySellProductId: String(linkedProductId) }
          : {}),
      },
    );

    const txAfterUpdate =
      existingTx ||
      (await Transaction.findOne({ orderId: razorpay_order_id }).lean());
    const productIdForFeature =
      linkedProductId || txAfterUpdate?.buySellProductId || null;

    const catalogItem = await findSubscriptionItemById(
      subscriptionItemId || txAfterUpdate?.packageId,
    );
    const verifiedPackageName = catalogItem?.packageName || packageName;

    // ── 3. Activate subscription in UserSubscription ────────────────────────
    const targetUserId = finalUserId || txAfterUpdate?.userId || null;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(
      endDate.getDate() +
        Number(catalogItem?.durationDays || durationDays || 0),
    );

    let userSub = null;
    if (!paymentAlreadyVerified) {
      userSub = await UserSubscription.findOneAndUpdate(
        { userId: targetUserId },
        {
          $push: {
            activeSubscriptions: {
              subscriptionItemId,
              fieldName: normalizedFieldName, // ✅ USE NORMALIZED VALUE
              packageName: verifiedPackageName,
              packageType: packageType || catalogItem?.packageType || "",
              durationDays: Number(
                catalogItem?.durationDays || durationDays || 0,
              ),
              price: Number(catalogItem?.price ?? price ?? 0),
              startDate,
              endDate,
              razorpayOrderId: razorpay_order_id,
              razorpayPaymentId: razorpay_payment_id,
              status: "active",
              autoPay: Boolean(autoPay),
            },
          },
        },
        { new: true, upsert: true },
      );
      // ── 4. Save purchased subscription to User collection ────────────────────
      if (finalUserId) {
        await User.findByIdAndUpdate(
          finalUserId,
          {
            $push: {
              purchasedSubscriptions: {
                subscriptionItemId,
                fieldName: normalizedFieldName?.toLowerCase() || "product",
                packageName: verifiedPackageName,
                packageType: packageType || catalogItem?.packageType || "",
                durationDays: Number(
                  catalogItem?.durationDays || durationDays || 0,
                ),
                price: Number(catalogItem?.price ?? price ?? 0),
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id,
                purchasedAt: new Date(),
                autoPay: Boolean(autoPay),
              },
            },
          },
          { new: true },
        );

        // ── 5. Create Expense Entry ───────────────────────────────────────────
        try {
          const expenseCategory = await IncomeExpenseCategory.findOne({
            id: "ac98ed91-a064-4491-b2ba-0d4971f84af2",
          });

          if (expenseCategory) {
            const userDoc = await User.findById(finalUserId);

            await IncomeExpense.create({
              type: "expense",
              categoryId: expenseCategory._id,
              remarks: `Subscription Purchase - ${verifiedPackageName}`,
              amount: Number(catalogItem?.price ?? price ?? 0),
              userId: userDoc?._id,
              userName: userDoc?.name || "",
            });

            console.log("Expense entry created successfully.");
          } else {
            console.log("Purchase subscription category not found.");
          }
        } catch (err) {
          console.error("Expense creation failed:", err);
        }
      }
    } else {
      userSub = await UserSubscription.findOne({
        userId: targetUserId,
      }).lean();
    }

    let featuredVehicleResult = null;
    if (
      productIdForFeature &&
      isFeaturedVehiclePackageName(verifiedPackageName)
    ) {
      try {
        featuredVehicleResult = await activateFeaturedVehicleFromPayment({
          actor: {
            id: finalUserId || targetUserId,
            mongoId: finalUserId || targetUserId,
          },
          userId: finalUserId || targetUserId,
          productId: productIdForFeature,
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          subscriptionItemId:
            subscriptionItemId || txAfterUpdate?.packageId,
          clientPackageName: packageName,
        });
      } catch (featureErr) {
        console.error(
          "[Payment] featured vehicle activation failed:",
          featureErr?.message || featureErr,
        );
        if (!paymentAlreadyVerified) {
          return res.status(featureErr.statusCode || 500).json({
            message:
              featureErr.message ||
              "Payment verified but featured vehicle activation failed",
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
          });
        }
      }
    }

    // ── 6. Save Log ──────────────────────────────────────────────────────────
    if (!paymentAlreadyVerified) {
      await new Log({
        name: actor?.name || "unknown",
        email: actor?.mobile || "",
        role: actor?.role || "",
        timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
        action: `payment verified: order ${razorpay_order_id}, payment ${razorpay_payment_id} — activated ${verifiedPackageName} (${normalizedFieldName}) for ${catalogItem?.durationDays || durationDays} days`,
      }).save();
    }

    if (finalUserId) {
      const expiryDate = endDate.toISOString().slice(0, 10);
      notify({
        userId: finalUserId,
        event: NOTIFICATION_EVENTS.PREMIUM_PURCHASED,
        data: {
          userName: actor?.name || 'User',
          planName: packageName,
          amount: price,
          expiryDate,
          transactionId: razorpay_payment_id,
        },
        metadata: {
          subscriptionItemId,
          orderId: razorpay_order_id,
        },
      }).catch((err) =>
        console.error("[Payment] premium notification failed:", err.message),
      );

      notify({
        userId: finalUserId,
        event: NOTIFICATION_EVENTS.PAYMENT_SUCCESS,
        data: {
          userName: actor?.name || 'User',
          amount: price,
          transactionId: razorpay_payment_id,
          planName: packageName,
        },
        metadata: { orderId: razorpay_order_id },
      }).catch((err) =>
        console.error("[Payment] payment success notification failed:", err.message),
      );
    }

    // ── 7. Response ──────────────────────────────────────────────────────────
    const featuredMessage =
      featuredVehicleResult?.record && isFeaturedVehiclePackageName(verifiedPackageName)
        ? featuredVehicleResult.duplicate
          ? "Payment successful. Your vehicle is already featured."
          : "Payment successful. Your vehicle is now featured."
        : null;

    return res.status(200).json({
      message: featuredMessage || "Payment verified and subscription activated",
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      subscription: userSub,
      featuredVehicle: featuredVehicleResult?.record || null,
      featuredVehicleCreated: Boolean(featuredVehicleResult?.created),
      featuredVehicleDuplicate: Boolean(featuredVehicleResult?.duplicate),
    });
  } catch (err) {
    console.error("Payment verification error:", err);

    return res.status(500).json({
      message: "Payment verification failed",
      error: err.message,
    });
  }
});

// ── POST /api/payment/fail ───────────────────────────────────────────────────
paymentRouter.post("/fail", async (req, res) => {
  try {
    const { orderId, errorDetails } = req.body;
    if (!orderId) {
      return res.status(400).json({ message: "orderId is required" });
    }
    await Transaction.findOneAndUpdate(
      { orderId },
      {
        status: "failed",
        errorDetails: String(errorDetails || "Payment failed or cancelled"),
        updatedAt: Date.now(),
      },
    );

    const tx = await Transaction.findOne({ orderId }).lean();
    if (tx?.userId) {
      notify({
        userId: tx.userId,
        event: NOTIFICATION_EVENTS.PAYMENT_FAILED,
        data: {
          amount: tx.price,
          transactionId: orderId,
        },
        metadata: { orderId },
      }).catch((err) =>
        console.error("[Payment] fail notification error:", err.message),
      );
    }

    res.status(200).json({ message: "Transaction updated to failed" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating transaction", error: error?.message });
  }
});

// ── GET /api/payment/transactions ──────────────────────────────────────────
paymentRouter.get("/transactions", async (req, res) => {
  try {
    const actor = req.user || {};
    const userId = actor?._id || actor?.id || null;
    const role = actor?.role?.name?.toLowerCase() || "";

    let query = {};
    if (role !== "admin" && role !== "superadmin") {
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      query.userId = String(userId);
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json(transactions);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching transactions", error: error?.message });
  }
});

// ── GET /api/payment/transaction/:txId ─────────────────────────────────────
paymentRouter.get("/transaction/:txId", async (req, res) => {
  try {
    const { txId } = req.params;
    const actor = req.user || {};
    const userId = actor?._id || actor?.id || null;
    const role = actor?.role?.name?.toLowerCase() || "";

    const tx = await Transaction.findById(txId).lean();

    if (!tx) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // Verify ownership unless admin
    if (role !== "admin" && role !== "superadmin") {
      if (String(tx.userId) !== String(userId)) {
        return res.status(403).json({ message: "Unauthorized" });
      }
    }

    res.status(200).json(tx);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching transaction", error: error?.message });
  }
});

// ── GET /api/payment/my-subscriptions ───────────────────────────────────────
// FIXED: Handle both ObjectId and string userId formats
// ── UPDATED ENDPOINTS using enrichedSubscriptions ──────────────────────────────

// Add this import at the top of your paymentRouter.js

// ── Updated: GET /api/payment/my-subscriptions ──────────────────────────────
paymentRouter.get("/my-subscriptions", async (req, res) => {
  try {
    const actor = req.user || {};
    const userId = actor?._id || actor?.id || null;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const query = buildUserIdQuery(userId);

    console.log(
      "[my-subscriptions] Searching with query:",
      JSON.stringify(query),
    );
    console.log("[my-subscriptions] Looking for userId:", userId);

    const doc = await UserSubscription.findOne(query);

    if (!doc) {
      console.log("[my-subscriptions] No document found for userId:", userId);
      return res.status(200).json({
        userId: String(userId),
        activeSubscriptions: [],
        summary: {
          totalActive: 0,
          expiringsoon: 0,
          expired: 0,
        },
      });
    }

    const plainDoc = doc.toObject();
    const allSubs = plainDoc?.activeSubscriptions || [];

    console.log("[my-subscriptions] Found", allSubs.length, "subscriptions");

    // ── Enrich subscriptions with computed fields ────────────────────────
    const enrichedSubs = enrichSubscriptions(
      allSubs.map((sub) => ({
        ...sub,
        _id: sub._id ? String(sub._id) : undefined,
      })),
    );

    // ── Calculate summary statistics ─────────────────────────────────────
    const summary = {
      totalActive: enrichedSubs.filter(
        (s) => s.computed.expirationStatus !== "expired",
      ).length,
      expiringThisWeek: enrichedSubs.filter(
        (s) => s.computed.expirationStatus === "expiring_this_week",
      ).length,
      expiringToday: enrichedSubs.filter(
        (s) => s.computed.daysRemaining <= 1 && !s.computed.isExpired,
      ).length,
      expired: enrichedSubs.filter((s) => s.computed.isExpired).length,
      willAutoRenew: enrichedSubs.filter((s) => s.computed.willAutoRenew)
        .length,
    };

    res.status(200).json({
      userId: String(userId),
      activeSubscriptions: enrichedSubs,
      summary,
    });
  } catch (error) {
    console.error("[my-subscriptions] Error:", error);
    res.status(500).json({
      message: "Error fetching subscriptions",
      error: error?.message || String(error),
    });
  }
});

// ── Updated: GET /api/payment/user-subscriptions/:userId ────────────────────
paymentRouter.get("/user-subscriptions/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const query = buildUserIdQuery(userId);

    console.log(
      "[user-subscriptions] Searching with query:",
      JSON.stringify(query),
    );
    console.log("[user-subscriptions] Looking for userId:", userId);

    const doc = await UserSubscription.findOne(query);

    if (!doc) {
      console.log("[user-subscriptions] No document found for userId:", userId);
      return res.status(200).json({
        userId,
        activeSubscriptions: [],
        summary: {
          totalActive: 0,
          expiringThisWeek: 0,
          expired: 0,
        },
      });
    }

    const plainDoc = doc.toObject();
    const allSubs = plainDoc?.activeSubscriptions || [];

    console.log("[user-subscriptions] Found", allSubs.length, "subscriptions");

    // ── Enrich subscriptions with computed fields ────────────────────────
    const enrichedSubs = enrichSubscriptions(
      allSubs.map((sub) => ({
        ...sub,
        _id: sub._id ? String(sub._id) : undefined,
      })),
    );

    // ── Calculate summary ────────────────────────────────────────────────
    const summary = {
      totalActive: enrichedSubs.filter(
        (s) => s.computed.expirationStatus !== "expired",
      ).length,
      expiringThisWeek: enrichedSubs.filter(
        (s) => s.computed.expirationStatus === "expiring_this_week",
      ).length,
      expiringToday: enrichedSubs.filter(
        (s) => s.computed.daysRemaining <= 1 && !s.computed.isExpired,
      ).length,
      expired: enrichedSubs.filter((s) => s.computed.isExpired).length,
      willAutoRenew: enrichedSubs.filter((s) => s.computed.willAutoRenew)
        .length,
    };

    res.status(200).json({
      userId,
      activeSubscriptions: enrichedSubs,
      summary,
    });
  } catch (error) {
    console.error("[user-subscriptions] Error:", error);
    res.status(500).json({
      message: "Error fetching user subscriptions",
      error: error?.message || String(error),
    });
  }
});
// ── POST /api/payment/admin-assign ──────────────────────────────────────────
paymentRouter.post("/admin-assign", async (req, res) => {
  try {
    const {
      userId,
      subscriptionItemId,
      fieldName,
      packageName,
      packageType,
      durationDays,
      price,
      user,
      requestingUser,
    } = req.body;

    const actor = user || requestingUser || req.user || {};
    const normalizedFieldName = normalizeFieldName(fieldName); // ✅ VALIDATE

    if (!userId) return res.status(400).json({ message: "userId is required" });
    if (!subscriptionItemId)
      return res
        .status(400)
        .json({ message: "subscriptionItemId is required" });

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + Number(durationDays || 0));

    const userSub = await UserSubscription.findOneAndUpdate(
      { userId },
      {
        $push: {
          activeSubscriptions: {
            subscriptionItemId,
            fieldName: normalizedFieldName, // ✅ USE NORMALIZED VALUE
            packageName,
            packageType: packageType || "",
            durationDays: Number(durationDays || 0),
            price: Number(price || 0),
            startDate,
            endDate,
            status: "active",
            assignedByAdmin: true,
          },
        },
      },
      { new: true, upsert: true },
    );

    // Also save to User collection (admin-assigned, no paymentId)
    await User.findByIdAndUpdate(userId, {
      $push: {
        purchasedSubscriptions: {
          subscriptionItemId,
          fieldName: normalizedFieldName?.toLowerCase() || "product", // ✅ USE NORMALIZED
          packageName,
          packageType: packageType || "",
          durationDays: Number(durationDays || 0),
          price: Number(price || 0),
          paymentId: null,
          orderId: null,
          purchasedAt: new Date(),
        },
      },
    });
    try {
      const expenseCategory = await IncomeExpenseCategory.findOne({
        id: "ac98ed91-a064-4491-b2ba-0d4971f84af2",
      });

      if (expenseCategory) {
        const userDoc = await User.findById(finalUserId);

        await IncomeExpense.create({
          type: "expense",
          categoryId: expenseCategory._id,
          remarks: `Subscription Purchase - ${packageName}`,
          amount: Number(price || 0),
          userId: userDoc?._id,
          userName: userDoc?.name || "",
        });

        console.log("Expense entry created successfully.");
      }
    } catch (err) {
      console.error("Expense creation failed:", err);
    }

    await new Log({
      name: actor?.name || "unknown",
      email: actor?.mobile || "",
      role: actor?.role || "",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `admin assigned subscription ${packageName} (${normalizedFieldName}) to user ${userId} for ${durationDays} days`,
    }).save();

    res.status(200).json({
      message: "Subscription assigned successfully",
      subscription: userSub,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error assigning subscription",
      error: error?.message || String(error),
    });
  }
});

// ── GET /api/payment/check-expired ──────────────────────────────────────────
// Manually trigger the expiry check (can also be called by external cron)
paymentRouter.get("/check-expired", async (req, res) => {
  try {
    const {
      processExpiredSubscriptions,
    } = require("../services/subscriptionScheduler");
    const results = await processExpiredSubscriptions();
    res.status(200).json({
      message: "Expiry check completed",
      ...results,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error running expiry check",
      error: error?.message || String(error),
    });
  }
});

// ── POST /api/payment/auto-pay-confirm ──────────────────────────────────────
// Called when user confirms auto-pay via the UI popup.
// Re-subscribes the user to the same plan for another duration cycle.
paymentRouter.post("/auto-pay-confirm", async (req, res) => {
  try {
    const {
      subscriptionItemId,
      fieldName,
      packageName,
      packageType,
      durationDays,
      price,
      user,
      requestingUser,
      userId,
    } = req.body;

    const actor = user || requestingUser || req.user || {};
    const finalUserId = String(userId || actor?._id || actor?.id || "");
    const normalizedFieldName = normalizeFieldName(fieldName); // ✅ VALIDATE

    if (!subscriptionItemId) {
      return res
        .status(400)
        .json({ message: "subscriptionItemId is required" });
    }
    if (!finalUserId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // Create a new subscription cycle
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + Number(durationDays || 0));

    // Add to UserSubscription
    const userSub = await UserSubscription.findOneAndUpdate(
      { userId: finalUserId },
      {
        $push: {
          activeSubscriptions: {
            subscriptionItemId,
            fieldName: normalizedFieldName, // ✅ USE NORMALIZED VALUE
            packageName,
            packageType: packageType || "",
            durationDays: Number(durationDays || 0),
            price: Number(price || 0),
            startDate,
            endDate,
            status: "active",
            assignedByAdmin: false,
          },
        },
      },
      { new: true, upsert: true },
    );

    // Also save to User collection's purchasedSubscriptions
    if (finalUserId) {
      // Try findById first, then findOne with id field
      let userDoc = null;
      try {
        userDoc = await User.findById(finalUserId);
      } catch (_) {}
      if (!userDoc) {
        userDoc = await User.findOne({ id: finalUserId });
      }

      if (userDoc) {
        userDoc.purchasedSubscriptions.push({
          subscriptionItemId,
          fieldName: normalizedFieldName?.toLowerCase() || "product", // ✅ USE NORMALIZED
          packageName,
          packageType: packageType || "",
          durationDays: Number(durationDays || 0),
          price: Number(price || 0),
          paymentId: null,
          orderId: null,
          purchasedAt: new Date(),
        });
        await userDoc.save();
      }
    }

    await new Log({
      name: actor?.name || "unknown",
      email: actor?.mobile || "",
      role: actor?.role || "",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `auto-pay confirmed: re-activated ${packageName} (${normalizedFieldName}) for user ${finalUserId} for ${durationDays} days`,
    }).save();

    res.status(200).json({
      message: "Auto-pay processed successfully. Subscription renewed.",
      subscription: userSub,
    });
  } catch (error) {
    console.error("[Payment] auto-pay-confirm error:", error);
    res.status(500).json({
      message: "Error processing auto-pay",
      error: error?.message || String(error),
    });
  }
});

module.exports = paymentRouter;
