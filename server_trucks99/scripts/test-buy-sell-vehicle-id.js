"use strict";

/**
 * Buy/Sell Vehicle ID tests — run with: node scripts/test-buy-sell-vehicle-id.js
 * Format checks always run. Concurrent uniqueness needs MONGODB_ATLAS.
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const {
  yymmddFromDate,
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
    "January 15 2026 count 1",
    formatVehicleId(yymmddFromDate(new Date(Date.UTC(2026, 0, 15, 12, 0, 0))), 1),
    "2601150001",
  );
  assertEqual(
    "August 18 2026 count 127",
    formatVehicleId(yymmddFromDate(new Date(Date.UTC(2026, 7, 18, 12, 0, 0))), 127),
    "2608180127",
  );
  assertEqual(
    "August 18 2026 count 128",
    formatVehicleId(yymmddFromDate(new Date(Date.UTC(2026, 7, 18, 12, 0, 0))), 128),
    "2608180128",
  );
  assertEqual(
    "August 25 2026 count 27 includes day",
    formatVehicleId(yymmddFromDate(new Date(Date.UTC(2026, 7, 25, 12, 0, 0))), 27),
    "2608250027",
  );
  assertEqual(
    "September 1 2026 count 1",
    formatVehicleId(yymmddFromDate(new Date(Date.UTC(2026, 8, 1, 12, 0, 0))), 1),
    "2609010001",
  );
  assertEqual("4-digit pad 27", formatVehicleId("260825", 27), "2608250027");
  assertEqual("4-digit max", formatVehicleId("260825", 9999), "2608259999");
  assertEqual(
    "BS number format",
    formatBsNumber(256, new Date(2026, 7, 18)),
    "18-08-2026 - BS256",
  );

  const parsed = parseNewVehicleId("2608250027");
  assertEqual("parse yymmdd", parsed && parsed.yymmdd, "260825");
  assertEqual("parse yymm", parsed && parsed.yymm, "2608");
  assertEqual("parse seq", parsed && parsed.seq, 27);
  assertEqual("is new format", isNewVehicleIdFormat("2608250027"), true);
  assertEqual("legacy is not new format", isNewVehicleIdFormat("18-08-2026 - BS127"), false);

  assertEqual(
    "response keeps new ID as stored",
    formatBsNumberWithDate("2608250027", new Date(2026, 7, 25)),
    "2608250027",
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
    formatVehicleId("260825", 0);
    fail("reject seq 0", "should have thrown");
  } catch {
    pass("reject seq 0");
  }

  try {
    formatVehicleId("260825", 10000);
    fail("reject seq 10000", "should have thrown");
  } catch {
    pass("reject seq 10000");
  }
}

async function runConcurrentCounterTest() {
  if (!process.env.MONGODB_ATLAS) {
    console.log("SKIP: concurrent uniqueness (MONGODB_ATLAS not set)");
    return;
  }

  await mongoose.connect(process.env.MONGODB_ATLAS.trim());
  const counterId = `buysell_vehicle_test_${Date.now()}`;
  const createdAt = new Date(Date.UTC(2026, 7, 18, 12, 0, 0));

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
    assertEqual("concurrent first id", sorted[0], "2608180001");
    assertEqual("concurrent last id", sorted[sorted.length - 1], "2608180020");
    const allMatch = ids.every((id) => /^\d{10}$/.test(id) && id.startsWith("260818"));
    if (allMatch) pass("concurrent format YYMMDD####");
    else fail("concurrent format YYMMDD####", ids.join(","));
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
