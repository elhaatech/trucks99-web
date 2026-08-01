const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const legalSectionSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "", trim: true },
    bullets: { type: [String], default: [] },
  },
  { _id: false },
);

const legalDocumentSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      sparse: true,
    },
    type: {
      type: String,
      enum: ["terms", "privacy"],
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      default: "",
      trim: true,
    },
    intro: {
      type: String,
      default: "",
      trim: true,
    },
    sections: {
      type: [legalSectionSchema],
      default: [],
    },
    contactEmail: {
      type: String,
      default: "mytrucks99@gmail.com",
      trim: true,
    },
    contactLabel: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true },
);

legalDocumentSchema.index({ type: 1 });
legalDocumentSchema.index({ status: 1 });

module.exports = mongoose.model("LegalDocument", legalDocumentSchema);
