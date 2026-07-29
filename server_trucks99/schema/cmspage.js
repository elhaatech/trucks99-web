const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const cmsPageSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      sparse: true,
    },
    page_title: {
      type: String,
      required: [true, "page_title is required"],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      required: [true, "slug is required"],
    },
    page_description: {
      type: String,
      required: [true, "page_description is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true }
);

// Index on slug for faster lookups
cmsPageSchema.index({ slug: 1 });
cmsPageSchema.index({ status: 1 });

// Virtual for id fallback
cmsPageSchema.virtual("_slug").get(function () {
  return this.slug;
});

module.exports = mongoose.model("CMSPage", cmsPageSchema);