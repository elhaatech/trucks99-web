const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const buySellSpecificationSchema = new mongoose.Schema(
  {
    specification_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Specification",
      required: true,
    },
    specification_value: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
);

const buySellSchema = new mongoose.Schema(
  {
    id: { type: String, default: randomUUID, unique: true, index: true },
    bsNumber: { type: String, unique: true, sparse: true, index: true },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    subcategory_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      required: true,
      index: true,
    },

    // ✅ ADD THIS BLOCK
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    price: {
      type: Number,
      required: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    images: {
      type: [String],
      default: [],
    },

    specifications: {
      type: [buySellSpecificationSchema],
      default: [],
    },

    country_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LocationCountry",
      default: null,
      index: true,
    },

    state_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LocationState",
      default: null,
      index: true,
    },

    city_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LocationCity",
      default: null,
      index: true,
    },

    address: { type: String, trim: true, default: "" },
    pincode: { type: String, trim: true, default: "" },
    user_type: {
      type: String,
      enum: ["buy", "sell"],
      index: true,
    },
    status: {
      type: String,
      enum: [
        "draft",
        "pending",
        "rejected",
        "accepeted",
        "booking",
        "purchased",
        "sold",
      ],
      default: "pending",
    },

    /** Set when a buyer pays an advance — product moves to `booking`. */
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    bookedAt: { type: Date, default: null },
    advanceAmount: { type: Number, default: null, min: 0 },

    /** Set when the buyer completes the remaining payment — product moves to `purchased`. */
    purchasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    purchasedAt: { type: Date, default: null },
    purchaseAmount: { type: Number, default: null, min: 0 },

    /** Set when the purchase lifecycle is fully completed — product moves to `sold`. */
    soldAt: { type: Date, default: null },

    viewCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },

    created_by: { type: String, default: null },
    updated_by: { type: String, default: null },
  },
  { timestamps: true },
);

/** Hot-path list/filter/sort indexes (marketplace browse + seller dashboards). */
buySellSchema.index({ status: 1, createdAt: -1 });
buySellSchema.index({ userid: 1, status: 1, createdAt: -1 });
buySellSchema.index({ category_id: 1, status: 1, createdAt: -1 });
buySellSchema.index({ subcategory_id: 1, status: 1, createdAt: -1 });
buySellSchema.index({ status: 1, price: 1, createdAt: -1 });
buySellSchema.index({
  country_id: 1,
  state_id: 1,
  city_id: 1,
  status: 1,
  createdAt: -1,
});
buySellSchema.index({
  "specifications.specification_id": 1,
  "specifications.specification_value": 1,
});

module.exports = mongoose.model("BuySellProduct", buySellSchema);
