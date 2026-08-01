"use strict";

/** Tenure options (months) offered by the calculator UI. */
const EMI_TENURES = [12, 24, 36, 48, 60];

const DEFAULT_INTEREST_RATE =
  Number(process.env.EMI_DEFAULT_INTEREST_RATE) || 10;

const DEFAULT_DOWN_PAYMENT_PERCENT =
  Number(process.env.EMI_DEFAULT_DOWN_PAYMENT_PERCENT) || 20;

const DEFAULT_TENURE_MONTHS =
  Number(process.env.EMI_DEFAULT_TENURE_MONTHS) || 36;

const MIN_INTEREST_RATE = 0;
const MAX_INTEREST_RATE = 36;

function getEmiDefaults() {
  return {
    tenures: EMI_TENURES,
    defaultInterestRate: DEFAULT_INTEREST_RATE,
    defaultDownPaymentPercent: DEFAULT_DOWN_PAYMENT_PERCENT,
    defaultTenureMonths: EMI_TENURES.includes(DEFAULT_TENURE_MONTHS)
      ? DEFAULT_TENURE_MONTHS
      : 36,
    minInterestRate: MIN_INTEREST_RATE,
    maxInterestRate: MAX_INTEREST_RATE,
  };
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Standard reducing-balance EMI:
 * EMI = P × R × (1+R)^N / ((1+R)^N − 1)
 */
function calculateEmiBreakdown({
  vehiclePrice,
  productPrice,
  downPayment = 0,
  interestRate,
  annualInterestRate,
  tenure,
  tenureMonths,
}) {
  const price = Math.max(0, Number(vehiclePrice ?? productPrice) || 0);
  const down = Math.min(Math.max(0, Number(downPayment) || 0), price);
  const rawRate = Number(interestRate ?? annualInterestRate ?? DEFAULT_INTEREST_RATE) || 0;
  const rate = clamp(rawRate, MIN_INTEREST_RATE, MAX_INTEREST_RATE);
  const months = Math.max(
    1,
    Math.floor(Number(tenure ?? tenureMonths) || DEFAULT_TENURE_MONTHS),
  );

  if (!Number.isFinite(price) || price < 0) {
    const err = new Error("Invalid vehicle price.");
    err.statusCode = 400;
    throw err;
  }
  if (!Number.isFinite(months) || months < 1 || months > 120) {
    const err = new Error("Tenure must be between 1 and 120 months.");
    err.statusCode = 400;
    throw err;
  }
  if (down > price) {
    const err = new Error("Down payment cannot exceed vehicle price.");
    err.statusCode = 400;
    throw err;
  }
  if (rawRate > MAX_INTEREST_RATE || rawRate < MIN_INTEREST_RATE) {
    const err = new Error(
      `Interest rate must be between ${MIN_INTEREST_RATE}% and ${MAX_INTEREST_RATE}%.`,
    );
    err.statusCode = 400;
    throw err;
  }

  const loanAmount = Math.max(0, price - down);
  const principalAmount = loanAmount;

  if (loanAmount <= 0) {
    return {
      vehiclePrice: Math.round(price),
      productPrice: Math.round(price),
      downPayment: Math.round(down),
      loanAmount: 0,
      principalAmount: 0,
      interestRate: rate,
      annualInterestRate: rate,
      tenure: months,
      tenureMonths: months,
      monthlyEmi: 0,
      monthlyEMI: 0,
      totalInterest: 0,
      totalPayable: Math.round(down),
    };
  }

  const monthlyRate = rate / 12 / 100;
  let monthlyEmi;

  if (monthlyRate === 0) {
    monthlyEmi = loanAmount / months;
  } else {
    const factor = Math.pow(1 + monthlyRate, months);
    monthlyEmi = (loanAmount * monthlyRate * factor) / (factor - 1);
  }

  const totalPayable = down + monthlyEmi * months;
  const totalInterest = Math.max(0, totalPayable - price);

  return {
    vehiclePrice: Math.round(price),
    productPrice: Math.round(price),
    downPayment: Math.round(down),
    loanAmount: Math.round(loanAmount),
    principalAmount: Math.round(principalAmount),
    interestRate: rate,
    annualInterestRate: rate,
    tenure: months,
    tenureMonths: months,
    monthlyEmi: Math.round(monthlyEmi),
    monthlyEMI: Math.round(monthlyEmi),
    totalInterest: Math.round(totalInterest),
    totalPayable: Math.round(totalPayable),
  };
}

module.exports = {
  EMI_TENURES,
  DEFAULT_INTEREST_RATE,
  DEFAULT_DOWN_PAYMENT_PERCENT,
  DEFAULT_TENURE_MONTHS,
  MIN_INTEREST_RATE,
  MAX_INTEREST_RATE,
  getEmiDefaults,
  calculateEmiBreakdown,
};
