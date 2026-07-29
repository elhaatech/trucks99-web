'use strict';

/**
 * Product marketplace offers (type === "product") may run without Bearer auth.
 * Load/truck bit routes remain protected via requireAuthUnlessPublic.
 */

function normalizeBitRecordType(body) {
  return String(body?.type || '')
    .trim()
    .toLowerCase();
}

function isBitRecordsPath(path) {
  return path === '/api/bit-records' || path.startsWith('/api/bit-records/');
}

/**
 * @param {import('express').Request} req
 * @param {string} path — no query string
 */
function isPublicProductBitRecordRoute(req, path) {
  if (!isBitRecordsPath(path)) return false;

  const body = req.body || {};
  const type = normalizeBitRecordType(body);
  if (type !== 'product') return false;

  if (req.method === 'POST' && path === '/api/bit-records/list') return true;
  if (req.method === 'POST' && path === '/api/bit-records') return true;
  if (req.method === 'PUT' && /^\/api\/bit-records\/[^/]+$/.test(path)) return true;

  return false;
}

module.exports = {
  isPublicProductBitRecordRoute,
};
