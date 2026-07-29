'use strict';

const mongoose = require('mongoose');
const ProductBitRecord = require('../schema/productBitRecord');
const IncomeExpense = require('../schema/incomeExpense');
const IncomeExpenseCategory = require('../schema/incomeExpenseCategory');
const User = require('../schema/user');
const { resolveToObjectId } = require('../helpers/uuidHelper');

function buildBuySellTransactionRemarks(product, bitRecord) {
  const productId = product._id?.toString?.() || String(product._id);
  const bitId = bitRecord._id?.toString?.() || String(bitRecord._id);
  const bsNumber = product.bsNumber || productId;
  return `Auto: BuySell offer accepted – ${bsNumber} [product:${productId}] [bit:${bitId}]`;
}

/** Resolve a user reference to a Mongo ObjectId (same pattern as handleIncomeExpense / bitService). */
async function resolveUserObjectId(userRef) {
  if (!userRef) return null;
  if (userRef instanceof mongoose.Types.ObjectId) return userRef;
  if (typeof userRef === 'object' && userRef._id) {
    return resolveUserObjectId(userRef._id);
  }
  return resolveToObjectId(User, String(userRef).trim());
}

/**
 * Find an active IncomeExpenseCategory for auto buy/sell transactions.
 * Mirrors handleLoad.js findDeliveryCategory — tries named patterns first, then fallback.
 */
async function findBuySellCategory(type) {
  const logPrefix = `[findBuySellCategory type=${type}]`;
  const namePatterns =
    type === 'income'
      ? [/^sell$/i, /sell/i, /buy.?sell/i]
      : [/^buy$/i, /buy/i, /purchase/i];

  for (const pattern of namePatterns) {
    const cat = await IncomeExpenseCategory.findOne({
      type,
      status: 'Active',
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
    status: 'Active',
  })
    .sort({ createdAt: -1 })
    .lean();
  if (fallback) {
    console.log(
      `${logPrefix} using fallback category "${fallback.categoryName}" (_id=${fallback._id})`,
    );
  } else {
    console.log(`${logPrefix} EARLY RETURN: no active ${type} category found`);
  }
  return fallback;
}

/**
 * When a buy/sell offer (ProductBitRecord) is accepted, create:
 * - Income for the seller (product.userid)   → category "Sell"
 * - Expense for the buyer (bitRecord.userId) → category "Buy"
 * Amount = bitRecord.bit. Runs at most once per accepted bit record.
 */
async function createBuySellTransactions(product, bitRecord) {
  const bitId = bitRecord._id?.toString?.() || String(bitRecord._id);
  const logPrefix = `[createBuySellTransactions bit=${bitId}]`;

  console.log(
    `${logPrefix} START status=${bitRecord.status} bit=${bitRecord.bit} transactionsCreatedAt=${bitRecord.transactionsCreatedAt || 'null'}`,
  );

  const amount =
    bitRecord.bit != null && !isNaN(Number(bitRecord.bit))
      ? Number(bitRecord.bit)
      : bitRecord.amount != null && !isNaN(Number(bitRecord.amount))
        ? Number(bitRecord.amount)
        : null;
  if (amount == null || amount <= 0) {
    console.log(
      `${logPrefix} EARLY RETURN: invalid bit amount (${bitRecord.bit})`,
    );
    return { skipped: true, reason: 'invalid_amount' };
  }

  const sellerId = await resolveUserObjectId(product.userid);
  if (!sellerId) {
    console.log(`${logPrefix} EARLY RETURN: product has no seller (userid)`);
    return { skipped: true, reason: 'missing_seller' };
  }
  console.log(`${logPrefix} sellerId=${sellerId}`);

  const buyerId = await resolveUserObjectId(
    bitRecord.userId || bitRecord.buyerId || bitRecord.bidderId || bitRecord.createdBy,
  );
  if (!buyerId) {
    console.log(
      `${logPrefix} EARLY RETURN: bit record has no buyer (userId/buyerId/bidderId)`,
    );
    return { skipped: true, reason: 'missing_buyer' };
  }
  console.log(`${logPrefix} buyerId=${buyerId}`);

  const remarks = buildBuySellTransactionRemarks(product, bitRecord);
  const [existingIncome, existingExpense] = await Promise.all([
    IncomeExpense.findOne({ type: 'income', remarks }).lean(),
    IncomeExpense.findOne({ type: 'expense', remarks }).lean(),
  ]);
  if (existingIncome && existingExpense) {
    console.log(
      `${logPrefix} EARLY RETURN: both transactions already exist (remarks="${remarks}")`,
    );
    await ProductBitRecord.findByIdAndUpdate(bitRecord._id, {
      $set: { transactionsCreatedAt: new Date() },
    });
    return { skipped: true, reason: 'transactions_exist' };
  }

  // Atomic claim — only when we still need to create records and no prior claim exists.
  if (!bitRecord.transactionsCreatedAt) {
    const claimed = await ProductBitRecord.findOneAndUpdate(
      {
        _id: bitRecord._id,
        $or: [
          { transactionsCreatedAt: null },
          { transactionsCreatedAt: { $exists: false } },
        ],
      },
      { $set: { transactionsCreatedAt: new Date() } },
      { new: true },
    ).lean();

    if (!claimed) {
      const [retryIncome, retryExpense] = await Promise.all([
        IncomeExpense.findOne({ type: 'income', remarks }).lean(),
        IncomeExpense.findOne({ type: 'expense', remarks }).lean(),
      ]);
      if (retryIncome && retryExpense) {
        console.log(
          `${logPrefix} EARLY RETURN: concurrent request already created transactions`,
        );
        return { skipped: true, reason: 'transactions_exist' };
      }
      console.log(
        `${logPrefix} atomic claim failed — another request in progress, will still try to create missing records`,
      );
    } else {
      console.log(`${logPrefix} atomic claim succeeded`);
    }
  } else if (!existingIncome || !existingExpense) {
    console.log(
      `${logPrefix} transactionsCreatedAt already set but records incomplete — retrying missing entries`,
    );
  }

  const [incomeCategory, expenseCategory] = await Promise.all([
    findBuySellCategory('income'),
    findBuySellCategory('expense'),
  ]);

  if (!incomeCategory) {
    await ProductBitRecord.findByIdAndUpdate(bitRecord._id, {
      $unset: { transactionsCreatedAt: 1 },
    });
    console.log(
      `${logPrefix} EARLY RETURN: no active income (Sell) category — rolled back claim`,
    );
    return { skipped: true, reason: 'missing_income_category' };
  }
  if (!expenseCategory) {
    await ProductBitRecord.findByIdAndUpdate(bitRecord._id, {
      $unset: { transactionsCreatedAt: 1 },
    });
    console.log(
      `${logPrefix} EARLY RETURN: no active expense (Buy) category — rolled back claim`,
    );
    return { skipped: true, reason: 'missing_expense_category' };
  }

  let incomeDoc = existingIncome;
  let expenseDoc = existingExpense;

  try {
    if (!incomeDoc) {
      console.log(
        `${logPrefix} BEFORE IncomeExpense.create income amount=${amount} userId=${sellerId} categoryId=${incomeCategory._id} category="${incomeCategory.categoryName}"`,
      );
      incomeDoc = await IncomeExpense.create({
        type: 'income',
        categoryId: incomeCategory._id,
        remarks,
        amount,
        status: 'active',
        userId: sellerId,
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
        `${logPrefix} BEFORE IncomeExpense.create expense amount=${amount} userId=${buyerId} categoryId=${expenseCategory._id} category="${expenseCategory.categoryName}"`,
      );
      expenseDoc = await IncomeExpense.create({
        type: 'expense',
        categoryId: expenseCategory._id,
        remarks,
        amount,
        status: 'active',
        userId: buyerId,
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
    await ProductBitRecord.findByIdAndUpdate(bitRecord._id, {
      $unset: { transactionsCreatedAt: 1 },
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
  return { skipped: false, incomeId: incomeDoc._id, expenseId: expenseDoc._id };
}

async function createBuySellPaymentTransactions(product, buyerRef, amount, paymentType) {
  const remarks = `Auto: BuySell Razorpay ${paymentType} – ${product.bsNumber || product._id} amount:${amount}`;
  const [existingIncome, existingExpense] = await Promise.all([
    IncomeExpense.findOne({ type: "income", remarks }).lean(),
    IncomeExpense.findOne({ type: "expense", remarks }).lean(),
  ]);
  if (existingIncome && existingExpense) {
    return { skipped: true, reason: "transactions_exist" };
  }

  const sellerId = await resolveUserObjectId(product.userid);
  const buyerId = await resolveUserObjectId(buyerRef);
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

  if (!existingIncome) {
    await IncomeExpense.create({
      type: "income",
      categoryId: incomeCategory._id,
      remarks,
      amount,
      status: "active",
      userId: sellerId,
    });
  }
  if (!existingExpense) {
    await IncomeExpense.create({
      type: "expense",
      categoryId: expenseCategory._id,
      remarks,
      amount,
      status: "active",
      userId: buyerId,
    });
  }

  return { skipped: false };
}

module.exports = {
  buildBuySellTransactionRemarks,
  findBuySellCategory,
  createBuySellTransactions,
  createBuySellPaymentTransactions,
};
