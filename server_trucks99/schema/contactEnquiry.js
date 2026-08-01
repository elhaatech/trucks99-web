const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const contactEnquirySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => randomUUID(),
      unique: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    message: { type: String, required: true, trim: true },
    attachment: { type: String, default: null },
    status: {
      type: String,
      enum: ["new", "read", "closed"],
      default: "new",
      index: true,
    },
    userId: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

contactEnquirySchema.index({ createdAt: -1 });

module.exports = mongoose.model("ContactEnquiry", contactEnquirySchema);
