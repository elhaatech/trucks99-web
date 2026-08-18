"use strict";

/**
 * Buy/Sell Vehicle ID tests — run with: node scripts/test-buy-sell-vehicle-id.js
 * Format checks always run. Concurrent uniqueness needs MONGODB_ATLAS.
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const {
  yymmFromDate,
  formatVehicleId,
  formatBsNumber,
  parseNewVehicleId,
  isNewVehicleIdFormat,
  formatBsNumberWithDate,
  generateNextVehicleId,
  seqFromFindOneAndUpdate,
} = require("../helpers/buySellVehicleId");

const results = [];

function pass(name, detail) {
  results.push({ name, ok: true, detail });
  console.log(`PASS: ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.log(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
}

function assertEqual(name, actual, expected) {
  if (actual === expected) pass(name, String(actual));
  else fail(name, `expected ${expected}, got ${actual}`);
}

function runFormatTests() {
  assertEqual(
    "January 2026 count 1",
    formatVehicleId(yymmFromDate(new Date(2026, 0, 15)), 1),
    "2601000001",
  );
  assertEqual(
    "August 2026 count 127",
    formatVehicleId(yymmFromDate(new Date(2026, 7, 18)), 127),
    "2608000127",
  );
  assertEqual(
    "August 2026 count 128",
    formatVehicleId(yymmFromDate(new Date(2026, 7, 18)), 128),
    "2608000128",
  );
  assertEqual(
    "September 2026 count 1",
    formatVehicleId(yymmFromDate(new Date(2026, 8, 1)), 1),
    "2609000001",
  );
  assertEqual("6-digit pad 27", formatVehicleId("2608", 27), "2608000027");
  assertEqual("6-digit max", formatVehicleId("2608", 999999), "2608999999");
  assertEqual(
    "BS number format",
    formatBsNumber(256, new Date(2026, 7, 18)),
    "18-08-2026 - BS256",
  );

  const parsed = parseNewVehicleId("2608000127");
  assertEqual("parse yymm", parsed && parsed.yymm, "2608");
  assertEqual("parse seq", parsed && parsed.seq, 127);
  assertEqual("is new format", isNewVehicleIdFormat("2608000127"), true);
  assertEqual("legacy is not new format", isNewVehicleIdFormat("18-08-2026 - BS127"), false);

  assertEqual(
    "response keeps new ID as stored",
    formatBsNumberWithDate("2608000127", new Date(2026, 7, 18)),
    "2608000127",
  );
  assertEqual(
    "legacy display unchanged in style",
    formatBsNumberWithDate("BS001", new Date(2026, 5, 29)),
    "29-06-2026 - BS001",
  );

  assertEqual(
    "seq from driver 6 document",
    seqFromFindOneAndUpdate({ _id: "x", seq: 12 }),
    12,
  );
  assertEqual(
    "seq from driver 4 wrapper",
    seqFromFindOneAndUpdate({ value: { seq: 9 } }),
    9,
  );

  try {
    formatVehicleId("2608", 0);
    fail("reject seq 0", "should have thrown");
  } catch {
    pass("reject seq 0");
  }
}

async function runConcurrentCounterTest() {
  if (!process.env.MONGODB_ATLAS) {
    console.log("SKIP: concurrent uniqueness (MONGODB_ATLAS not set)");
    return;
  }

  await mongoose.connect(process.env.MONGODB_ATLAS.trim());
  const counterId = `buysell_vehicle_test_${Date.now()}`;
  const createdAt = new Date(2026, 7, 18);

  try {
    const ids = await Promise.all(
      Array.from({ length: 20 }, () =>
        generateNextVehicleId(createdAt, { counterId, maxExisting: 0 }),
      ),
    );

    const unique = new Set(ids);
    if (unique.size !== ids.length) {
      fail("concurrent IDs unique", `duplicates in ${ids.join(",")}`);
    } else {
      pass("concurrent IDs unique", `${ids.length} ids`);
    }

    const sorted = [...ids].sort();
    assertEqual("concurrent first id", sorted[0], "2608000001");
    assertEqual("concurrent last id", sorted[sorted.length - 1], "2608000020");
    const allMatch = ids.every((id) => /^\d{10}$/.test(id) && id.startsWith("2608"));
    if (allMatch) pass("concurrent format YYMM######");
    else fail("concurrent format YYMM######", ids.join(","));
  } finally {
    await mongoose.connection.collection("counters").deleteOne({ _id: counterId });
    await mongoose.disconnect();
  }
}

async function main() {
  runFormatTests();
  await runConcurrentCounterTest();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
