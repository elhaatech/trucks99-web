const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const specificationValueSchema = new mongoose.Schema(
  {
    id: { type: String, default: randomUUID, unique: true, index: true },
    specification_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Specification",
      required: true,
      index: true,
    },
    specification_value_name: { type: String, required: true, trim: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    created_date: { type: Date, default: Date.now },
    created_by: { type: String, default: "system" },
    updated_date: { type: Date, default: Date.now },
    updated_by: { type: String, default: "system" },
    subcategory_id: { type: String, required: true, index: true },
  },
  { timestamps: false },
);

module.exports = mongoose.model("SpecificationValue", specificationValueSchema);
