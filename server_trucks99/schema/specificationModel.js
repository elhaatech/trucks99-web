const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const specificationSchema = new mongoose.Schema(
  {
    id: { type: String, default: randomUUID, unique: true, index: true },
    specification_name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["selectable", "input", "date", "datetime", "number", "file", "multiselect"],
      default: "input",
    },
    is_required: { type: String, enum: ["Yes", "No"], default: "No" },
    need_filter: { type: String, enum: ["Yes", "No"], default: "No" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },

    // ── number config ──────────────────────────────────────────
    number_min: { type: Number, default: null },
    number_max: { type: Number, default: null },
    number_decimal: { type: String, enum: ["Yes", "No"], default: "No" },

    // ── date / datetime config ─────────────────────────────────
    date_min: { type: String, default: null }, // ISO string or null
    date_max: { type: String, default: null },

    // ── file config ────────────────────────────────────────────
    file_max_size_mb: { type: Number, default: null },          // e.g. 5
    file_allowed_types: { type: [String], default: [] },        // ["pdf","jpg","png"]
    file_multiple: { type: String, enum: ["Yes", "No"], default: "No" },

    created_date: { type: Date, default: Date.now },
    created_by: { type: String, default: "system" },
    updated_date: { type: Date, default: Date.now },
    updated_by: { type: String, default: "system" },
  },
  { timestamps: false },
);

module.exports = mongoose.model("Specification", specificationSchema);