"use strict";

const express = require("express");
const {
  getEmiDefaults,
  calculateEmiBreakdown,
} = require("../services/emiCalculatorService");

const emiRouter = express.Router();

/**
 * GET /api/emi/tenures
 * Public defaults + allowed tenure list for the calculator UI.
 */
emiRouter.get("/tenures", (_req, res) => {
  try {
    return res.status(200).json({
      message: "EMI calculator defaults",
      data: getEmiDefaults(),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load EMI defaults",
      error: error?.message || String(error),
    });
  }
});

/**
 * POST /api/emi/calculate
 * Body: { vehiclePrice|productPrice, downPayment, interestRate|annualInterestRate, tenure|tenureMonths }
 */
emiRouter.post("/calculate", (req, res) => {
  try {
    const body = req.body || {};
    const result = calculateEmiBreakdown({
      vehiclePrice: body.vehiclePrice,
      productPrice: body.productPrice,
      downPayment: body.downPayment,
      interestRate: body.interestRate,
      annualInterestRate: body.annualInterestRate,
      tenure: body.tenure,
      tenureMonths: body.tenureMonths,
    });

    return res.status(200).json({
      message: "EMI calculated successfully",
      data: result,
    });
  } catch (error) {
    const status = error?.statusCode || 500;
    return res.status(status).json({
      message: error?.message || "Failed to calculate EMI",
      error: error?.message || String(error),
    });
  }
});

module.exports = emiRouter;