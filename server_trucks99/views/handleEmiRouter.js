"use strict";

const crypto = require("crypto");
const express = require("express");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const EmiPlan = require("../schema/emiPlan");
const BuySellProduct = require("../schema/buysellProduct");
const Transaction = require("../schema/transaction");
const Log = require("../schema/log");
const { resolveToObjectId } = require("../helpers/uuidHelper");
const {
  EMI_TENURES,
  calculateEmiBreakdown,
  getInitialPaymentMode,
  getInitialPaymentAmount,
  applyEmiPayment,
  formatEmiPlan,
} = require("../services/emiService");
const {
  notify,
  NOTIFICATION_EVENTS,
} = require("../services/notificationService");
const { productLabel } = require("../helpers/productLabel");

const emiRouter = express.Router();

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

function getActor(req) {
  const user = req.user || {};
  const roleId = user.roleId;
  const roleNameFromRef =
    roleId && typeof roleId === "object"
      ? roleId.name || roleId.status
      : null;
  return {
    id: user._id || user.id || null,
    mongoId: user._id ? String(user._id) : null,
    customId: user.id ? String(user.id) : null,
    name: user.name || "unknown",
    email: user.email || "unknown",
    role: user.role || roleNameFromRef || "unknown",
    roleId: roleId || null,
  };
}

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

function isSameUserAsActor(storedUserId, actor) {
  if (!storedUserId || !actor) return false;
  const stored = String(storedUserId).toLowerCase();
  for (const id of collectActorUserIds(actor)) {
    if (String(id).toLowerCase() === stored) return true;
  }
  return false;
}

/**
 * userId / sellerId on EmiPlan are Mixed (ObjectId or custom uuid string).
 * A plain `$in` of string ids does not match stored ObjectIds — mirror buysell userid filter.
 */
function buildMixedUserFieldConditions(fieldName, actor) {
  if (!actor?.id) return [];

  const conditions = [];
  const mongoId =
    actor.mongoId && /^[a-fA-F0-9]{24}$/.test(actor.mongoId)
      ? new mongoose.Types.ObjectId(actor.mongoId)
      : null;
  const customId = actor.customId ? String(actor.customId) : null;
  const idStr = actor.id ? String(actor.id) : null;

  if (mongoId) {
    conditions.push({ [fieldName]: mongoId });
  }

  const stringIds = new Set();
  if (customId) stringIds.add(customId);
  if (idStr) stringIds.add(idStr);
  if (actor.mongoId) stringIds.add(actor.mongoId);

  for (const sid of stringIds) {
    conditions.push({
      $expr: { $eq: [{ $toString: `$${fieldName}` }, sid] },
    });
  }

  return conditions;
}

/** EMI plans visible to buyer (userId) or seller (sellerId). */
function buildEmiActorAccessFilter(actor) {
  const buyerConditions = buildMixedUserFieldConditions("userId", actor);
  const sellerConditions = buildMixedUserFieldConditions("sellerId", actor);
  const all = [...buyerConditions, ...sellerConditions];

  if (all.length === 0) {
    return { _id: null };
  }
  if (all.length === 1) return all[0];
  return { $or: all };
}

function canViewEmiPlan(plan, actor) {
  if (!plan || !actor?.id) return false;
  if (isAdminActor(actor)) return true;
  return (
    isSameUserAsActor(plan.userId, actor) ||
    isSameUserAsActor(plan.sellerId, actor)
  );
}

function getEmiViewerRole(plan, actor) {
  if (isAdminActor(actor)) return "admin";
  if (isSameUserAsActor(plan.userId, actor)) return "buyer";
  if (isSameUserAsActor(plan.sellerId, actor)) return "seller";
  return null;
}

function formatEmiPlanForActor(plan, product, actor) {
  const formatted = formatEmiPlan(plan, product);
  if (!formatted) return null;
  const viewerRole = actor ? getEmiViewerRole(plan, actor) : null;
  const isBuyer = viewerRole === "buyer";
  const canPay =
    isBuyer &&
    plan.emiStatus !== "cancelled" &&
    plan.emiStatus !== "completed" &&
    plan.paymentStatus !== "completed";
  const canCancel =
    (isBuyer || isAdminActor(actor)) &&
    plan.emiStatus !== "completed" &&
    plan.emiStatus !== "cancelled";

  return {
    ...formatted,
    viewerRole,
    canPay,
    canCancel,
  };
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

function sendRouteError(res, error, fallbackMessage) {
  const status = error?.statusCode || 500;
  return res.status(status).json({
    success: false,
    message: error?.message || fallbackMessage,
  });
}

async function loadEmiPlanById(id) {
  const resolved = await resolveToObjectId(EmiPlan, id);
  if (!resolved) return null;
  return EmiPlan.findById(resolved).lean();
}

async function createRazorpayOrderForEmi({
  actor,
  plan,
  amount,
  paymentLabel,
  installmentNo,
}) {
  const payAmount = Number(amount);
  if (!Number.isFinite(payAmount) || payAmount <= 0) {
    const err = new Error("Invalid payment amount.");
    err.statusCode = 400;
    throw err;
  }

  const receipt = `emi_${String(plan._id).slice(-8)}_${Date.now()}`.slice(0, 40);
  const order = await getRazorpay().orders.create({
    amount: Math.round(payAmount * 100),
    currency: "INR",
    receipt,
    notes: {
      emiPlanId: String(plan._id),
      productId: String(plan.productId),
      userId: String(actor.id),
      paymentLabel,
      installmentNo: String(installmentNo),
      paymentPurpose: "buysell_emi",
    },
  });

  await Transaction.create({
    orderId: order.id,
    userId: String(actor.id),
    packageId: String(plan.productId),
    packageDuration: 0,
    price: payAmount,
    status: "created",
    orderDetails: {
      ...order,
      paymentPurpose: "buysell_emi",
      emiPlanId: String(plan._id),
      installmentNo,
      paymentLabel,
      productId: String(plan.productId),
    },
  });

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_T2J2vGFVIw0xpl",
    payAmount,
  };
}

// POST /api/emi/create — create EMI plan + initial Razorpay order
emiRouter.post("/create", async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor.id) {
      return res.status(401).json({ success: false, message: "Unauthorized user" });
    }

    const {
      productId,
      downPayment = 0,
      interestRate,
      tenure,
      initialPaymentMode,
    } = req.body || {};

    const resolvedProductId = await resolveToObjectId(BuySellProduct, productId);
    if (!resolvedProductId) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }

    const product = await BuySellProduct.findById(resolvedProductId).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    if (!["active", "pending"].includes(product.status)) {
      return res.status(400).json({
        success: false,
        message: "Product is not available for purchase.",
      });
    }
    if (isSameUserAsActor(product.userid, actor)) {
      return res.status(400).json({
        success: false,
        message: "You cannot purchase your own product.",
      });
    }

    const existingActive = await EmiPlan.findOne({
      productId: resolvedProductId,
      emiStatus: { $in: ["pending", "active"] },
      ...(() => {
        const buyerOnly = buildMixedUserFieldConditions("userId", actor);
        if (buyerOnly.length === 0) return { _id: null };
        if (buyerOnly.length === 1) return buyerOnly[0];
        return { $or: buyerOnly };
      })(),
    }).lean();
    if (existingActive) {
      return res.status(400).json({
        success: false,
        message: "You already have an active EMI plan for this product.",
        data: { emiPlanId: existingActive._id },
      });
    }

    const breakdown = calculateEmiBreakdown({
      productPrice: product.price,
      downPayment,
      interestRate: interestRate ?? undefined,
      tenure,
    });

    const mode =
      initialPaymentMode === "first_emi" ? "first_emi" : getInitialPaymentMode();

    const plan = await EmiPlan.create({
      userId: actor.id,
      productId: resolvedProductId,
      sellerId: product.userid,
      productPrice: breakdown.productPrice,
      downPayment: breakdown.downPayment,
      loanAmount: breakdown.loanAmount,
      interestRate: breakdown.interestRate,
      tenure: breakdown.tenure,
      monthlyEMI: breakdown.monthlyEMI,
      totalInterest: breakdown.totalInterest,
      totalPayable: breakdown.totalPayable,
      paidAmount: 0,
      remainingAmount:
        Math.round((breakdown.downPayment + breakdown.totalPayable) * 100) / 100,
      installmentsPaid: 0,
      paymentType: "emi",
      paymentStatus: "pending",
      emiStatus: "pending",
      initialPaymentMode: mode,
    });

    const initialAmount = getInitialPaymentAmount(plan);
    if (initialAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Initial EMI payment amount must be greater than zero.",
      });
    }

    const order = await createRazorpayOrderForEmi({
      actor,
      plan,
      amount: initialAmount,
      paymentLabel:
        mode === "first_emi" ? "First EMI" : "Down payment",
      installmentNo: 0,
    });

    await EmiPlan.findByIdAndUpdate(plan._id, {
      $set: { razorpayOrderId: order.orderId },
    });

    notify({
      userId: actor.id,
      event: NOTIFICATION_EVENTS.EMI_APPLICATION,
      data: {
        userName: actor.name || 'User',
        productName: productLabel(product),
        amount: breakdown.downPayment + breakdown.totalPayable,
        bookingId: plan.id || String(plan._id),
      },
      metadata: { productId: resolvedProductId, emiPlanId: plan._id },
    }).catch((err) =>
      console.error("[emi create] notification failed:", err.message),
    );

    res.status(201).json({
      success: true,
      message: "EMI plan created. Complete payment to activate.",
      data: {
        emiPlan: formatEmiPlanForActor(plan.toObject ? plan.toObject() : plan, product, actor),
        order,
      },
    });
  } catch (error) {
    sendRouteError(res, error, "Error creating EMI plan");
  }
});

// POST /api/emi/verify-payment — verify Razorpay payment for EMI
emiRouter.post("/verify-payment", async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor.id) {
      return res.status(401).json({ success: false, message: "Unauthorized user" });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      emiPlanId,
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
    if (!tx) {
      return res.status(404).json({ success: false, message: "Transaction not found." });
    }

    const planId = emiPlanId || tx?.orderDetails?.emiPlanId;
    const plan = await loadEmiPlanById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: "EMI plan not found." });
    }

    if (!isAdminActor(actor) && !isSameUserAsActor(plan.userId, actor)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to verify this EMI payment.",
      });
    }

    if (plan.emiStatus === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "This EMI plan has been cancelled.",
      });
    }

    const payAmount = Number(tx.price) || 0;
    const updatedPlan = await applyEmiPayment(plan, payAmount, {
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });

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

    const product = await BuySellProduct.findById(plan.productId).lean();

    await Log.create({
      name: actor.name,
      email: actor.email,
      role: actor.role,
      action: `EMI payment verified for plan ${plan._id} — ₹${payAmount}`,
    });

    const pName = productLabel(product);
    const buyerName = actor.name || 'Buyer';
    notify({
      userId: plan.userId,
      event: NOTIFICATION_EVENTS.EMI_PAYMENT_SUCCESS,
      data: {
        userName: buyerName,
        productName: pName,
        amount: payAmount,
        transactionId: razorpay_payment_id,
      },
      metadata: { emiPlanId: plan._id, productId: plan.productId },
    }).catch((err) =>
      console.error("[emi verify] notification failed:", err.message),
    );

    notify({
      userId: plan.userId,
      event: NOTIFICATION_EVENTS.PAYMENT_SUCCESS,
      data: {
        userName: buyerName,
        productName: pName,
        amount: payAmount,
        transactionId: razorpay_payment_id,
      },
      metadata: { emiPlanId: plan._id, orderId: razorpay_order_id },
    }).catch((err) =>
      console.error("[emi verify] payment notification failed:", err.message),
    );

    if (updatedPlan.emiStatus === "completed") {
      notify({
        userId: plan.userId,
        event: NOTIFICATION_EVENTS.PRODUCT_PURCHASED,
        data: {
          userName: buyerName,
          productName: pName,
          amount: plan.productPrice,
          transactionId: razorpay_payment_id,
        },
        metadata: { productId: plan.productId, emiPlanId: plan._id },
      }).catch((err) =>
        console.error("[emi verify] purchase notification failed:", err.message),
      );

      if (plan.sellerId) {
        notify({
          userId: plan.sellerId,
          event: NOTIFICATION_EVENTS.PRODUCT_SOLD,
          data: {
            productName: pName,
            amount: plan.productPrice,
            buyerName,
          },
          metadata: { productId: plan.productId },
        }).catch((err) =>
          console.error("[emi verify] sold notification failed:", err.message),
        );
      }
    } else if (updatedPlan.emiStatus === "active" && plan.emiStatus === "pending") {
      notify({
        userId: plan.userId,
        event: NOTIFICATION_EVENTS.PRODUCT_BOOKING,
        data: {
          userName: buyerName,
          productName: pName,
          amount: payAmount,
          bookingId: plan.id || String(plan._id),
        },
        metadata: { productId: plan.productId, emiPlanId: plan._id },
      }).catch((err) =>
        console.error("[emi verify] booking notification failed:", err.message),
      );
    }

    res.json({
      success: true,
      message:
        updatedPlan.emiStatus === "completed"
          ? "EMI completed. Product purchased successfully."
          : updatedPlan.emiStatus === "active"
            ? "EMI plan activated successfully."
            : "EMI payment received.",
      data: {
        emiPlan: formatEmiPlanForActor(updatedPlan, product, actor),
        productStatus: product?.status,
      },
    });
  } catch (error) {
    sendRouteError(res, error, "Error verifying EMI payment");
  }
});

// GET /api/emi/list
emiRouter.get("/list", async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor.id) {
      return res.status(401).json({ success: false, message: "Unauthorized user" });
    }

    const adminView = isAdminActor(actor);
    const filter = adminView ? {} : buildEmiActorAccessFilter(actor);

    if (req.query.emiStatus) {
      filter.emiStatus = String(req.query.emiStatus);
    }
    if (req.query.paymentStatus) {
      filter.paymentStatus = String(req.query.paymentStatus);
    }
    if (req.query.search) {
      const search = String(req.query.search).trim();
      if (search) {
        const products = await BuySellProduct.find({
          $or: [
            { description: { $regex: search, $options: "i" } },
            { bsNumber: { $regex: search, $options: "i" } },
          ],
        })
          .select("_id")
          .lean();
        filter.productId = { $in: products.map((p) => p._id) };
      }
    }

    const plans = await EmiPlan.find(filter).sort({ createdAt: -1 }).lean();
    const productIds = [...new Set(plans.map((p) => String(p.productId)))];
    const products = await BuySellProduct.find({ _id: { $in: productIds } })
      .select("_id description price images bsNumber status")
      .lean();
    const productMap = Object.fromEntries(products.map((p) => [String(p._id), p]));

    res.json({
      success: true,
      data: plans.map((plan) =>
        formatEmiPlanForActor(
          plan,
          productMap[String(plan.productId)] || null,
          actor,
        ),
      ),
    });
  } catch (error) {
    sendRouteError(res, error, "Error fetching EMI list");
  }
});

// GET /api/emi/view/:id
emiRouter.get("/view/:id", async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor.id) {
      return res.status(401).json({ success: false, message: "Unauthorized user" });
    }

    const plan = await loadEmiPlanById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: "EMI plan not found." });
    }

    if (!canViewEmiPlan(plan, actor)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this EMI plan.",
      });
    }

    const product = await BuySellProduct.findById(plan.productId).lean();
    res.json({
      success: true,
      data: formatEmiPlanForActor(plan, product, actor),
    });
  } catch (error) {
    sendRouteError(res, error, "Error fetching EMI plan");
  }
});

// PUT /api/emi/pay/:id — create Razorpay order for next EMI payment
emiRouter.put("/pay/:id", async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor.id) {
      return res.status(401).json({ success: false, message: "Unauthorized user" });
    }

    const plan = await loadEmiPlanById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: "EMI plan not found." });
    }

    if (!isSameUserAsActor(plan.userId, actor)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to pay this EMI plan.",
      });
    }

    if (plan.emiStatus === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "This EMI plan has been cancelled.",
      });
    }
    if (plan.emiStatus === "completed" || plan.paymentStatus === "completed") {
      return res.status(400).json({
        success: false,
        message: "This EMI plan is already completed.",
      });
    }

    let payAmount = 0;
    let installmentNo = 0;
    let paymentLabel = "";

    if (plan.emiStatus === "pending") {
      payAmount = getInitialPaymentAmount(plan);
      installmentNo = 0;
      paymentLabel =
        plan.initialPaymentMode === "first_emi" ? "First EMI" : "Down payment";
    } else {
      payAmount = Math.min(
        Number(plan.monthlyEMI) || 0,
        Number(plan.remainingAmount) || 0,
      );
      installmentNo = (Number(plan.installmentsPaid) || 0) + 1;
      paymentLabel = `EMI installment ${installmentNo}`;
    }

    if (payAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "No payment due for this EMI plan.",
      });
    }

    const order = await createRazorpayOrderForEmi({
      actor,
      plan,
      amount: payAmount,
      paymentLabel,
      installmentNo,
    });

    res.json({
      success: true,
      message: "Payment order created.",
      data: {
        emiPlanId: plan._id,
        order,
      },
    });
  } catch (error) {
    sendRouteError(res, error, "Error creating EMI payment order");
  }
});

// PUT /api/emi/cancel/:id
emiRouter.put("/cancel/:id", async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor.id) {
      return res.status(401).json({ success: false, message: "Unauthorized user" });
    }

    const plan = await loadEmiPlanById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: "EMI plan not found." });
    }

    const isOwner = isSameUserAsActor(plan.userId, actor);
    const isAdmin = isAdminActor(actor);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to cancel this EMI plan.",
      });
    }

    if (plan.emiStatus === "completed") {
      return res.status(400).json({
        success: false,
        message: "Completed EMI plans cannot be cancelled.",
      });
    }
    if (plan.emiStatus === "cancelled") {
      return res.json({
        success: true,
        message: "EMI plan is already cancelled.",
        data: formatEmiPlanForActor(plan, null, actor),
      });
    }

    const reason = String(req.body?.reason || "").trim();
    const updated = await EmiPlan.findByIdAndUpdate(
      plan._id,
      {
        $set: {
          emiStatus: "cancelled",
          paymentStatus: plan.paidAmount > 0 ? "partial" : "pending",
          cancelledAt: new Date(),
          cancelledBy: actor.id,
          cancelReason: reason || (isAdmin ? "Cancelled by admin" : "Cancelled by user"),
          nextDueDate: null,
        },
      },
      { new: true },
    ).lean();

    await Log.create({
      name: actor.name,
      email: actor.email,
      role: actor.role,
      action: `Cancelled EMI plan ${plan._id}`,
    });

    res.json({
      success: true,
      message: "EMI plan cancelled.",
      data: formatEmiPlanForActor(updated, null, actor),
    });
  } catch (error) {
    sendRouteError(res, error, "Error cancelling EMI plan");
  }
});

// GET /api/emi/tenures — supported tenure options (public read)
emiRouter.get("/tenures", (_req, res) => {
  res.json({
    success: true,
    data: {
      tenures: EMI_TENURES,
      defaultInterestRate: Number(process.env.EMI_DEFAULT_INTEREST_RATE) || 12,
      initialPaymentMode: getInitialPaymentMode(),
    },
  });
});

module.exports = emiRouter;
