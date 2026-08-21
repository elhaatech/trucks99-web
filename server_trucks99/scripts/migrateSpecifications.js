"use strict";

/**
 * Migrate specification catalog + selectable values from
 * migiratation/buy/sell/brand/*.json into specifications /
 * specificationvalues.
 *
 * Usage:
 *   node scripts/migrateSpecifications.js --dry-run
 *   node scripts/migrateSpecifications.js
 *
 * Duplicate-safe: specs are upserted by official _id, values by
 * (specification_id + subcategory_id + name). Existing products are
 * remapped onto the official specification _ids.
 */

require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const mongoose = require("mongoose");

const Specification = require("../schema/specificationModel");
const SpecificationValue = require("../schema/specificationValueModel");
const BuySellProduct = require("../schema/buysellProduct");

const DRY_RUN = process.argv.includes("--dry-run");
const GLOBAL_SUBCATEGORY = "*";
const ACTOR = "migration";
const DATA_DIR = path.join(__dirname, "..", "migiratation", "buy", "sell", "brand");

const OFFICIAL_SPECS = [
  {
    _id: "6a4899bfd56f8035ba446e46",
    id: "80eeb57b-f74a-4049-9f4a-405b774d7861",
    specification_name: "Insurance",
    type: "selectable",
    is_required: "No",
    need_filter: "No",
    status: "Active",
    number_min: null,
    number_max: null,
    number_decimal: "No",
    date_min: null,
    date_max: null,
    file_max_size_mb: null,
    file_allowed_types: [],
    file_multiple: "No",
    created_date: "2026-07-04T05:27:27.359Z",
    created_by: "Pavithra",
    updated_date: "2026-07-04T05:27:27.359Z",
    updated_by: "Pavithra",
  },
  {
    _id: "6a41f4e20fd927b44f1a2254",
    id: "6a0b524b-82e6-4ea4-a8fd-6c611d6ab6e9",
    specification_name: "Brand",
    type: "selectable",
    is_required: "No",
    need_filter: "No",
    status: "Active",
    number_min: null,
    number_max: null,
    number_decimal: "No",
    date_min: null,
    date_max: null,
    file_max_size_mb: null,
    file_allowed_types: [],
    file_multiple: "No",
    created_date: "2026-06-29T04:30:26.587Z",
    created_by: "Pavithra",
    updated_date: "2026-06-29T04:30:38.277Z",
    updated_by: "Pavithra",
  },
  {
    _id: "6a32457a46ebddbeb905e8b9",
    id: "40d90e70-879f-414f-81d3-f09b9f42ff17",
    specification_name: "No. of Owners",
    type: "selectable",
    is_required: "No",
    need_filter: "No",
    status: "Active",
    number_min: null,
    number_max: null,
    number_decimal: "No",
    date_min: null,
    date_max: null,
    file_max_size_mb: null,
    file_allowed_types: [],
    file_multiple: "No",
    created_date: "2026-06-17T06:58:02.143Z",
    created_by: "Pavithra",
    updated_date: "2026-08-06T14:49:53.241Z",
    updated_by: "Pavithra",
  },
  {
    _id: "6a32447946ebddbeb905e6f2",
    id: "6701bf10-a318-4c8c-b6e3-480d30dbc842",
    specification_name: "Fuel Type",
    type: "selectable",
    is_required: "Yes",
    need_filter: "Yes",
    status: "Active",
    number_min: null,
    number_max: null,
    number_decimal: "No",
    date_min: null,
    date_max: null,
    file_max_size_mb: null,
    file_allowed_types: [],
    file_multiple: "No",
    created_date: "2026-06-17T06:53:45.540Z",
    created_by: "Pavithra",
    updated_date: "2026-06-17T06:53:45.540Z",
    updated_by: "Pavithra",
  },
  {
    _id: "6a32444546ebddbeb905e6db",
    id: "062eedb5-b550-4bdf-bda9-77c50c7840dc",
    specification_name: "KM Driven",
    type: "number",
    is_required: "No",
    need_filter: "No",
    status: "Active",
    number_min: null,
    number_max: null,
    number_decimal: "No",
    date_min: null,
    date_max: null,
    file_max_size_mb: null,
    file_allowed_types: [],
    file_multiple: "No",
    created_date: "2026-06-17T06:52:53.331Z",
    created_by: "Pavithra",
    updated_date: "2026-06-17T06:52:53.331Z",
    updated_by: "Pavithra",
  },
  {
    _id: "6a32441146ebddbeb905e6c4",
    id: "1856930e-2788-46df-80e9-977c7e9b88f5",
    specification_name: "Make Year",
    type: "number",
    is_required: "Yes",
    need_filter: "Yes",
    status: "Active",
    number_min: 2000,
    number_max: 2026,
    number_decimal: "No",
    date_min: null,
    date_max: null,
    file_max_size_mb: null,
    file_allowed_types: [],
    file_multiple: "No",
    created_date: "2026-06-17T06:52:01.852Z",
    created_by: "Pavithra",
    updated_date: "2026-06-17T06:52:01.852Z",
    updated_by: "Pavithra",
  },
  {
    _id: "6a41f4e30fd927b44f1a2255",
    id: "b7c1e2a4-9f3d-4c8e-8a21-1f6d0c4e9b77",
    specification_name: "Model",
    type: "selectable",
    is_required: "No",
    need_filter: "No",
    status: "Active",
    number_min: null,
    number_max: null,
    number_decimal: "No",
    date_min: null,
    date_max: null,
    file_max_size_mb: null,
    file_allowed_types: [],
    file_multiple: "No",
    created_date: "2026-03-13T08:15:04.115Z",
    created_by: "Pavithra",
    updated_date: "2026-03-13T08:15:04.115Z",
    updated_by: "Pavithra",
  },
];

const OWNER_VALUES = ["1", "2", "3", "4", "5+"];

// Spec _ids written onto products by the earlier vehicle import.
const PRODUCT_SPEC_ID_MAP = {
  "6a7dae093bd76bf10c1e4a83": "6a41f4e20fd927b44f1a2254", // Brand
  "6a7dae0a3bd76bf10c1e4a8a": "6a41f4e30fd927b44f1a2255", // Model
  "6a7dae0a3bd76bf10c1e4a8d": "6a32447946ebddbeb905e6f2", // Fuel Type
  "6a87dc5e7f4e721373aa5ab4": "6a32441146ebddbeb905e6c4", // Make Year
  "6a87dc5e7f4e721373aa5ab6": "6a32444546ebddbeb905e6db", // KM Driven
  "6a87dc5e7f4e721373aa5ab8": "6a32457a46ebddbeb905e8b9", // No. of Owners
};

function oid(id) {
  return new mongoose.Types.ObjectId(String(id));
}

function isObjectIdString(id) {
  return typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);
}

function readJson(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function asArray(raw, key) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw[key])) return raw[key];
  return [];
}

function specFields(spec) {
  const { _id, ...rest } = spec;
  return {
    ...rest,
    file_allowed_types: rest.file_allowed_types || [],
    created_date: rest.created_date ? new Date(rest.created_date) : new Date(),
    updated_date: rest.updated_date ? new Date(rest.updated_date) : new Date(),
  };
}

async function upsertSpecifications() {
  const summary = { inserted: 0, updated: 0, renamedCleanup: 0 };
  for (const spec of OFFICIAL_SPECS) {
    const _id = oid(spec._id);
    const fields = specFields(spec);

    const sameNameOtherId = await Specification.findOne({
      specification_name: spec.specification_name,
      _id: { $ne: _id },
    }).lean();
    if (sameNameOtherId) {
      if (!DRY_RUN) {
        await SpecificationValue.deleteMany({ specification_id: sameNameOtherId._id });
        await Specification.deleteOne({ _id: sameNameOtherId._id });
      }
      summary.renamedCleanup += 1;
      console.log(
        `[spec] removed duplicate "${spec.specification_name}" _id=${sameNameOtherId._id}`,
      );
    }

    const existing = await Specification.findById(_id).lean();
    if (DRY_RUN) {
      summary[existing ? "updated" : "inserted"] += 1;
      continue;
    }
    if (existing) {
      await Specification.updateOne({ _id }, { $set: fields });
    } else {
      await Specification.create({ _id, ...fields });
    }
    summary[existing ? "updated" : "inserted"] += 1;
  }
  return summary;
}

function valueDoc({ specificationId, name, sourceId, createdAt }) {
  const now = createdAt ? new Date(createdAt) : new Date();
  const doc = {
    specification_id: oid(specificationId),
    specification_value_name: name,
    subcategory_id: GLOBAL_SUBCATEGORY,
    status: "Active",
    created_date: now,
    created_by: ACTOR,
    updated_date: now,
    updated_by: ACTOR,
  };
  if (isObjectIdString(sourceId)) doc._id = oid(sourceId);
  if (!doc.id) doc.id = randomUUID();
  return doc;
}

async function upsertValues(specificationId, items) {
  const summary = { inserted: 0, updated: 0, skipped: 0 };
  const specOid = oid(specificationId);

  for (const item of items) {
    const name = String(item.name || "").trim();
    if (!name) {
      summary.skipped += 1;
      continue;
    }

    const existing = await SpecificationValue.findOne({
      specification_id: specOid,
      subcategory_id: GLOBAL_SUBCATEGORY,
      specification_value_name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    }).lean();

    if (existing) {
      if (!DRY_RUN) {
        await SpecificationValue.updateOne(
          { _id: existing._id },
          {
            $set: {
              specification_value_name: name,
              status: "Active",
              subcategory_id: GLOBAL_SUBCATEGORY,
              updated_date: new Date(),
              updated_by: ACTOR,
            },
          },
        );
      }
      summary.updated += 1;
      continue;
    }

    if (!DRY_RUN) {
      const doc = valueDoc({
        specificationId,
        name,
        sourceId: item.sourceId,
        createdAt: item.createdAt,
      });
      try {
        await SpecificationValue.create(doc);
      } catch (err) {
        if (err?.code === 11000 && isObjectIdString(item.sourceId)) {
          delete doc._id;
          doc.id = randomUUID();
          await SpecificationValue.create(doc);
        } else {
          throw err;
        }
      }
    }
    summary.inserted += 1;
  }
  return summary;
}

async function remapProductSpecIds() {
  const summary = { matched: 0, modified: 0 };
  for (const [fromId, toId] of Object.entries(PRODUCT_SPEC_ID_MAP)) {
    const fromOid = oid(fromId);
    const toOid = oid(toId);
    const filter = { "specifications.specification_id": fromOid };
    const matched = await BuySellProduct.countDocuments(filter);
    if (!matched) continue;
    if (!DRY_RUN) {
      const result = await BuySellProduct.updateMany(
        filter,
        { $set: { "specifications.$[elem].specification_id": toOid } },
        { arrayFilters: [{ "elem.specification_id": fromOid }] },
      );
      summary.modified += result.modifiedCount || 0;
    }
    summary.matched += matched;
    console.log(
      `[products] ${fromId} -> ${toId} listings=${matched}${DRY_RUN ? " (dry-run)" : ""}`,
    );
  }
  return summary;
}

async function main() {
  const uri = (process.env.MONGODB_ATLAS || "").trim();
  if (!uri) throw new Error("MONGODB_ATLAS is not set");

  await mongoose.connect(uri);
  console.log(`[migrate] db=${mongoose.connection.name} dryRun=${DRY_RUN}`);

  const specSummary = await upsertSpecifications();
  console.log("[migrate] specifications", specSummary);

  const brandItems = asArray(readJson("brand.json"), "brands").map((row) => ({
    name: row.name,
    sourceId: row._id,
    createdAt: row.createdAt,
  }));
  const fuelItems = asArray(readJson("fule-type.json"), "types").map((row) => ({
    name: row.type || row.name,
    sourceId: row._id,
    createdAt: row.createdAt,
  }));
  const insuranceItems = asArray(readJson("insurance-types.json"), "types").map((row) => ({
    name: row.name || row.type,
    sourceId: row._id,
    createdAt: row.createdAt,
  }));
  const modelItems = asArray(readJson("model.json"), "models").map((row) => ({
    name: row.brand ? `${row.brand} ${row.name}` : row.name,
    sourceId: row._id,
    createdAt: row.createdAt,
  }));
  const ownerItems = OWNER_VALUES.map((name) => ({ name }));

  const valueResults = {
    Brand: await upsertValues("6a41f4e20fd927b44f1a2254", brandItems),
    "Fuel Type": await upsertValues("6a32447946ebddbeb905e6f2", fuelItems),
    Insurance: await upsertValues("6a4899bfd56f8035ba446e46", insuranceItems),
    Model: await upsertValues("6a41f4e30fd927b44f1a2255", modelItems),
    "No. of Owners": await upsertValues("6a32457a46ebddbeb905e8b9", ownerItems),
  };
  console.log("[migrate] specification values", valueResults);

  const productSummary = await remapProductSpecIds();
  console.log("[migrate] product spec remap", productSummary);

  const specCount = await Specification.countDocuments();
  const valueCount = await SpecificationValue.countDocuments();
  console.log(`[migrate] done specs=${specCount} values=${valueCount}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[migrate] failed", err);
  process.exit(1);
});
