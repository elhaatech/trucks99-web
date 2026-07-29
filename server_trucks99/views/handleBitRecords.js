'use strict';

const express = require('express');
const bitService = require('../services/bitService');
const { BitServiceError } = bitService;

const router = express.Router();

function sendError(res, err, fallbackMessage) {
  if (err instanceof BitServiceError) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
      error: err.message,
    });
  }
  console.error(fallbackMessage, err);
  return res.status(500).json({
    success: false,
    message: fallbackMessage,
    error: err?.message || String(err),
  });
}

/**
 * POST /api/bit-records/list — list bids (entity-scoped or user-wide)
 */
router.post('/list', async (req, res) => {
  try {
    const out = await bitService.listBitRecords(req.body || {}, req.user);

    return res.status(200).json({
      success: true,
      bitRecords: out.bitRecords,
    });
  } catch (err) {
    return sendError(res, err, 'Error fetching bit records');
  }
});

/**
 * POST /api/bit-records — create bid (load | truck | product)
 */
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const type = String(body.type || '').trim().toLowerCase();
    if (type !== 'product' && !req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login.' });
    }

    const out = await bitService.createBid(body, req.user);

    return res.status(out.statusCode).json({
      success: true,
      message: out.message,
      bitRecord: out.bitRecord,
      type: out.type,
    });
  } catch (err) {
    return sendError(res, err, 'Error creating bid');
  }
});

/**
 * PUT /api/bit-records/:id — update bid (load | truck | product, resolved by id)
 */
router.put('/:id', async (req, res) => {
  try {
    const out = await bitService.updateBid(
      req.params.id,
      req.body || {},
      req.user,
    );

    return res.status(out.statusCode).json({
      success: true,
      message: out.message,
      bitRecord: out.bitRecord,
      type: out.type,
    });
  } catch (err) {
    return sendError(res, err, 'Error updating bid');
  }
});

module.exports = router;
