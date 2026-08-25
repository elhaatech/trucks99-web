"use strict";

const mongoose = require("mongoose");

const VEHICLE_ID_TZ = "Asia/Kolkata";
const NEW_VEHICLE_ID_RE = /^(\d{6})(\d{4})$/;
const COUNTER_PREFIX = "buysell_vehicle_";
const BS_COUNTER_ID = "buysell_bs";
const MAX_DAILY_SEQ = 9999;

function getBuySellProduct() {
  return require("../schema/buysellProduct");
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function yymmddFromDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid creation date for vehicle ID");
  }
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: VEHICLE_ID_TZ,
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  return `${pad2(get("year"))}${pad2(get("month"))}${pad2(get("day"))}`;
}

/** @deprecated Use yymmddFromDate. Kept so older callers still resolve. */
function yymmFromDate(date = new Date()) {
  return yymmddFromDate(date);
}

function formatVehicleId(yymmdd, seq) {
  const n = Number(seq);
  if (!Number.isInteger(n) || n < 1 || n > MAX_DAILY_SEQ) {
    throw new Error(`Vehicle ID counter out of range: ${seq}`);
  }
  return `${yymmdd}${String(n).padStart(4, "0")}`;
}

function formatBsNumber(seq, createdAt = new Date()) {
  const n = Number(seq);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`BS number counter out of range: ${seq}`);
  }
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year} - BS${String(n).padStart(3, "0")}`;
}

function parseNewVehicleId(value) {
  const match = String(value || "").trim().match(NEW_VEHICLE_ID_RE);
  if (!match) return null;
  const yymmdd = match[1];
  return {
    yymmdd,
    yymm: yymmdd.slice(0, 4),
    seq: parseInt(match[2], 10),
  };
}

function isNewVehicleIdFormat(value) {
  return parseNewVehicleId(value) != null;
}

function seqFromFindOneAndUpdate(res) {
  if (!res || typeof res !== "object") return null;
  if (typeof res.seq === "number") return res.seq;
  if (res.value && typeof res.value.seq === "number") return res.value.seq;
  return null;
}

function countersCollection() {
  return mongoose.connection.collection("counters");
}

function dailyCounterId(yymmdd) {
  return `${COUNTER_PREFIX}${yymmdd}`;
}

async function findMaxExistingSeqForDay(yymmdd) {
  const BuySellProduct = getBuySellProduct();
  const minId = `${yymmdd}0000`;
  const maxId = `${yymmdd}9999`;
  const docs = await BuySellProduct.find(
    {
      $or: [
        { vehicleId: { $gte: minId, $lte: maxId } },
        { bsNumber: { $gte: minId, $lte: maxId } },
      ],
    },
    { vehicleId: 1, bsNumber: 1 },
  ).lean();

  let maxSeq = 0;
  for (const doc of docs) {
    for (const value of [doc.vehicleId, doc.bsNumber]) {
      const parsed = parseNewVehicleId(value);
      if (parsed && parsed.yymmdd === yymmdd && parsed.seq > maxSeq) {
        maxSeq = parsed.seq;
      }
    }
  }
  return maxSeq;
}

async function findMaxExistingBsSeq() {
  const BuySellProduct = getBuySellProduct();
  const docs = await BuySellProduct.find(
    { bsNumber: { $exists: true, $ne: null } },
    { bsNumber: 1 },
  ).lean();

  let maxExisting = 0;
  for (const doc of docs) {
    const match = String(doc.bsNumber).match(/BS(\d+)/);
    if (!match) continue;
    const num = Number(match[1]);
    if (Number.isFinite(num) && num > maxExisting) {
      maxExisting = num;
    }
  }
  return maxExisting;
}

async function reserveCounterRange(counterId, count, maxExisting) {
  const n = Math.trunc(Number(count));
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`Invalid allocation count: ${count}`);
  }

  const coll = countersCollection();
  await coll.findOneAndUpdate(
    { _id: counterId },
    { $max: { seq: maxExisting } },
    { upsert: true },
  );

  const res = await coll.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: n } },
    { upsert: true, returnDocument: "after" },
  );

  const end = seqFromFindOneAndUpdate(res);
  if (end == null) {
    throw new Error(`Failed to allocate counter ${counterId}`);
  }

  const start = end - n + 1;
  if (start < 1) {
    throw new Error(`Counter ${counterId} produced an invalid range`);
  }
  return { start, end };
}

async function reserveDailySeqRange(yymmdd, count, options = {}) {
  const n = Math.trunc(Number(count));
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`Invalid vehicle ID allocation count: ${count}`);
  }

  const counterId = options.counterId || dailyCounterId(yymmdd);
  const maxExisting =
    typeof options.maxExisting === "number"
      ? options.maxExisting
      : await findMaxExistingSeqForDay(yymmdd);

  const range = await reserveCounterRange(counterId, n, maxExisting);
  if (range.end > MAX_DAILY_SEQ) {
    throw new Error("Vehicle ID daily counter overflow (max 9999)");
  }
  return range;
}

async function allocateVehicleIds(count, createdAt = new Date(), options = {}) {
  const n = Math.trunc(Number(count));
  if (!Number.isInteger(n) || n < 1) return [];
  const yymmdd = yymmddFromDate(createdAt);
  const { start, end } = await reserveDailySeqRange(yymmdd, n, options);
  const ids = [];
  for (let i = start; i <= end; i += 1) {
    ids.push(formatVehicleId(yymmdd, i));
  }
  return ids;
}

async function allocateBsNumbers(count, createdAt = new Date()) {
  const n = Math.trunc(Number(count));
  if (!Number.isInteger(n) || n < 1) return [];
  const maxExisting = await findMaxExistingBsSeq();
  const { start, end } = await reserveCounterRange(BS_COUNTER_ID, n, maxExisting);
  const ids = [];
  for (let i = start; i <= end; i += 1) {
    ids.push(formatBsNumber(i, createdAt));
  }
  return ids;
}

async function generateNextVehicleId(createdAt = new Date(), options = {}) {
  const [id] = await allocateVehicleIds(1, createdAt, options);
  return id;
}

async function generateNextBsNumber(createdAt = new Date()) {
  const [id] = await allocateBsNumbers(1, createdAt);
  return id;
}

/** Prefer dedicated vehicleId; fall back if an earlier create stored YYMMDD#### in bsNumber. */
function resolveVehicleId(item) {
  if (!item) return null;
  if (item.vehicleId && String(item.vehicleId).trim()) {
    return String(item.vehicleId).trim();
  }
  if (isNewVehicleIdFormat(item.bsNumber)) {
    return String(item.bsNumber).trim();
  }
  return null;
}

/**
 * List/detail API presentation for the human BS number.
 * Stored documents are never rewritten here.
 */
function formatBsNumberWithDate(bsNumber, createdAt) {
  if (!bsNumber) return null;
  const raw = String(bsNumber).trim();
  if (!raw) return null;
  if (isNewVehicleIdFormat(raw)) return raw;

  const match = raw.match(/BS(\d+)/);
  if (!match) return raw;

  const date = createdAt ? new Date(createdAt) : new Date();
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year} - BS${match[1]}`;
}

module.exports = {
  NEW_VEHICLE_ID_RE,
  yymmddFromDate,
  yymmFromDate,
  formatVehicleId,
  formatBsNumber,
  parseNewVehicleId,
  isNewVehicleIdFormat,
  seqFromFindOneAndUpdate,
  findMaxExistingSeqForDay,
  findMaxExistingSeqForMonth: findMaxExistingSeqForDay,
  findMaxExistingBsSeq,
  reserveDailySeqRange,
  reserveMonthlySeqRange: reserveDailySeqRange,
  allocateVehicleIds,
  allocateBsNumbers,
  generateNextVehicleId,
  generateNextBsNumber,
  resolveVehicleId,
  formatBsNumberWithDate,
};
