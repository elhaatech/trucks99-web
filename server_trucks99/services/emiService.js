"use strict";

const mongoose = require("mongoose");
const EmiPlan = require("../schema/emiPlan");
const BuySellProduct = require("../schema/buysellProduct");
const IncomeExpense = require("../schema/incomeExpense");
const User = require("../schema/user");
const { resolveToObjectId } = require("../helpers/uuidHelper");
const { findBuySellCategory } = require("./buySellTransactionService");

const EMI_TENURES = [3, 6, 9, 12, 18, 24, 36];
const DEFAULT_INTEREST_RATE = Number(process.env.EMI_DEFAULT_INTEREST_RATE) || 12;

function getInitialPaymentMode() {
  const mode = String(process.env.EMI_INITIAL_PAYMENT_MODE || "down_payment")
    .toLowerCase()
    .trim();
  return mode === "first_emi" ? "first_emi" : "down_payment";
}

/** EMI = P × R × (1+R)^N / ((1+R)^N − 1) */
function calculateEmiBreakdown({
  productPrice,
  downPayment = 0,
  interestRate = DEFAULT_INTEREST_RATE,
  tenure,
}) {
  const price = Number(productPrice) || 0;
  const down = Math.max(0, Number(downPayment) || 0);
  const rate = Math.max(0, Number(interestRate) || 0);
  const months = Number(tenure);

  if (!Number.isFinite(months) || !EMI_TENURES.includes(months)) {
    const err = new Error("Invalid EMI tenure.");
    err.statusCode = 400;
    throw err;
  }
  if (down > price) {
    const err = new Error("Down payment cannot exceed product price.");
    err.statusCode = 400;
    throw err;
  }

  const loanAmount = Math.max(0, price - down);
  if (loanAmount <= 0) {
    return {
      productPrice: price,
      downPayment: down,
      loanAmount: 0,
      interestRate: rate,
      tenure: months,
      monthlyEMI: 0,
      totalInterest: 0,
      totalPayable: down,
    };
  }

  const R = rate / 100 / 12;
  const N = months;
  let monthlyEMI;
  let totalPayable;
  let totalInterest;

  if (R === 0) {
    monthlyEMI = loanAmount / N;
    totalPayable = loanAmount;
    totalInterest = 0;
  } else {
    const factor = Math.pow(1 + R, N);
    monthlyEMI = (loanAmount * R * factor) / (factor - 1);
    totalPayable = monthlyEMI * N;
    totalInterest = totalPayable - loanAmount;
  }

  return {
    productPrice: price,
    downPayment: down,
    loanAmount: Math.round(loanAmount * 100) / 100,
    interestRate: rate,
    tenure: months,
    monthlyEMI: Math.round(monthlyEMI * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100,
  };
}

function getInitialPaymentAmount(plan) {
  if (plan.initialPaymentMode === "first_emi") {
    return Number(plan.monthlyEMI) || 0;
  }
  return Number(plan.downPayment) || 0;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

async function resolveUserObjectId(userRef) {
  if (!userRef) return null;
  if (userRef instanceof mongoose.Types.ObjectId) return userRef;
  if (typeof userRef === "object" && userRef._id) {
    return resolveUserObjectId(userRef._id);
  }
  return resolveToObjectId(User, String(userRef).trim());
}

function buildEmiTransactionRemarks(plan, installmentNo, amount) {
  const planId = plan._id?.toString?.() || String(plan._id);
  const productId = plan.productId?.toString?.() || String(plan.productId);
  return `Auto: EMI payment – plan:${planId} product:${productId} installment:${installmentNo} amount:${amount}`;
}

async function createEmiPaymentTransactions(plan, amount, installmentNo) {
  const remarks = buildEmiTransactionRemarks(plan, installmentNo, amount);
  const [existingIncome, existingExpense] = await Promise.all([
    IncomeExpense.findOne({ type: "income", remarks }).lean(),
    IncomeExpense.findOne({ type: "expense", remarks }).lean(),
  ]);
  if (existingIncome && existingExpense) {
    return { skipped: true, reason: "transactions_exist" };
  }

  const sellerId = await resolveUserObjectId(plan.sellerId);
  const buyerId = await resolveUserObjectId(plan.userId);
  if (!sellerId || !buyerId) {
    return { skipped: true, reason: "missing_users" };
  }

  const [incomeCategory, expenseCategory] = await Promise.all([
    findBuySellCategory("income"),
    findBuySellCategory("expense"),
  ]);
  if (!incomeCategory || !expenseCategory) {
    return { skipped: true, reason: "missing_categories" };
  }

  let incomeDoc = existingIncome;
  let expenseDoc = existingExpense;

  if (!incomeDoc) {
    incomeDoc = await IncomeExpense.create({
      type: "income",
      categoryId: incomeCategory._id,
      remarks,
      amount,
      status: "active",
      userId: sellerId,
    });
  }
  if (!expenseDoc) {
    expenseDoc = await IncomeExpense.create({
      type: "expense",
      categoryId: expenseCategory._id,
      remarks,
      amount,
      status: "active",
      userId: buyerId,
    });
  }

  return {
    skipped: false,
    incomeId: incomeDoc._id,
    expenseId: expenseDoc._id,
  };
}

async function applyEmiPayment(plan, payAmount, paymentMeta = {}) {
  const amount = Number(payAmount) || 0;
  if (amount <= 0) {
    const err = new Error("Invalid payment amount.");
    err.statusCode = 400;
    throw err;
  }

  const totalDue =
    Math.round((Number(plan.downPayment) + Number(plan.totalPayable)) * 100) / 100;
  const paidAmount = Math.round((Number(plan.paidAmount) + amount) * 100) / 100;
  const remainingAmount = Math.max(
    0,
    Math.round((totalDue - paidAmount) * 100) / 100,
  );

  const isInitial = plan.emiStatus === "pending";
  let newInstallmentsPaid = Number(plan.installmentsPaid) || 0;

  if (isInitial) {
    newInstallmentsPaid =
      plan.initialPaymentMode === "first_emi" ? 1 : 0;
  } else {
    newInstallmentsPaid += 1;
  }

  const actuallyCompleted = remainingAmount <= 0.01 || newInstallmentsPaid >= plan.tenure;

  const installmentNo = isInitial ? 0 : newInstallmentsPaid;
  const label = isInitial
    ? plan.initialPaymentMode === "first_emi"
      ? "First EMI"
      : "Down payment"
    : `EMI installment ${installmentNo}`;

  const paymentStatus = actuallyCompleted
    ? "completed"
    : paidAmount > 0
      ? "partial"
      : "pending";

  const emiStatus = actuallyCompleted
    ? "completed"
    : plan.emiStatus === "pending"
      ? "active"
      : plan.emiStatus;

  const nextDueDate = actuallyCompleted
    ? null
    : addMonths(new Date(), 1);

  const historyEntry = {
    installmentNo,
    amount,
    razorpayOrderId: paymentMeta.razorpayOrderId || null,
    razorpayPaymentId: paymentMeta.razorpayPaymentId || null,
    paidAt: new Date(),
    label,
  };

  const updatedPlan = await EmiPlan.findByIdAndUpdate(
    plan._id,
    {
      $set: {
        paidAmount,
        remainingAmount: actuallyCompleted ? 0 : remainingAmount,
        installmentsPaid: newInstallmentsPaid,
        paymentStatus,
        emiStatus,
        nextDueDate,
        razorpayOrderId: paymentMeta.razorpayOrderId || plan.razorpayOrderId,
        razorpayPaymentId: paymentMeta.razorpayPaymentId || plan.razorpayPaymentId,
      },
      $push: { paymentHistory: historyEntry },
    },
    { new: true },
  ).lean();

  const product = await BuySellProduct.findById(plan.productId).lean();
  const productUpdate = actuallyCompleted
    ? {
        status: "purchased",
        purchasedBy: plan.userId,
        purchasedAt: new Date(),
        purchaseAmount: plan.productPrice,
        advanceAmount: plan.downPayment,
        updated_by: "emi-system",
      }
    : plan.emiStatus === "pending"
      ? {
          status: "booking",
          bookedBy: plan.userId,
          bookedAt: new Date(),
          advanceAmount: plan.downPayment || amount,
          updated_by: "emi-system",
        }
      : null;

  if (productUpdate) {
    await BuySellProduct.findByIdAndUpdate(plan.productId, { $set: productUpdate });
  }

  await createEmiPaymentTransactions(updatedPlan, amount, installmentNo);

  return updatedPlan;
}

function formatEmiPlan(plan, product = null) {
  if (!plan) return null;
  return {
    _id: plan._id,
    id: plan.id,
    userId: plan.userId,
    productId: plan.productId,
    sellerId: plan.sellerId,
    productPrice: plan.productPrice,
    downPayment: plan.downPayment,
    loanAmount: plan.loanAmount,
    interestRate: plan.interestRate,
    tenure: plan.tenure,
    monthlyEMI: plan.monthlyEMI,
    totalInterest: plan.totalInterest,
    totalPayable: plan.totalPayable,
    paidAmount: plan.paidAmount,
    remainingAmount: plan.remainingAmount,
    installmentsPaid: plan.installmentsPaid,
    nextDueDate: plan.nextDueDate,
    paymentType: plan.paymentType,
    paymentStatus: plan.paymentStatus,
    emiStatus: plan.emiStatus,
    initialPaymentMode: plan.initialPaymentMode,
    razorpayOrderId: plan.razorpayOrderId,
    razorpayPaymentId: plan.razorpayPaymentId,
    paymentHistory: plan.paymentHistory || [],
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    product: product
      ? {
          _id: product._id,
          id: product.id,
          description: product.description,
          price: product.price,
          images: product.images || [],
          bsNumber: product.bsNumber,
          status: product.status,
        }
      : undefined,
  };
}

module.exports = {
  EMI_TENURES,
  DEFAULT_INTEREST_RATE,
  getInitialPaymentMode,
  calculateEmiBreakdown,
  getInitialPaymentAmount,
  applyEmiPayment,
  createEmiPaymentTransactions,
  formatEmiPlan,
  addMonths,
};
