const mongoose = require("mongoose");
const { randomUUID } = require("crypto");
const { Schema } = mongoose;

const AD_TYPES = ["Text", "Banner", "Image", "Video"];
const DISPLAY_LOCATIONS = [
  "Home Page",
  "Dashboard",
  "Product Listing",
  "Product Details",
  "Search Page",
  "Sidebar",
  "Footer",
  "Popup",
];

const advertisementSchema = new Schema(
  {
    id: { type: String, default: randomUUID, unique: true, index: true },
    uuid: { type: String }, // legacy id alias, kept for parity with other modules

    adTitle: { type: String, required: true, trim: true },
    clientName: { type: String, required: true, trim: true },

    adType: { type: String, enum: AD_TYPES, required: true },
    description: { type: String, default: "" },

    /** Path/URL of uploaded image or video, relevant when adType is Image/Banner/Video */
    mediaUrl: { type: String, default: "" },

    /** Where the user is taken when the ad is clicked */
    redirectUrl: { type: String, default: "" },

    displayLocation: { type: String, enum: DISPLAY_LOCATIONS, required: true },

    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },

    status: { type: String, enum: ["Enabled", "Disabled"], default: "Enabled" },

    /** Lower number = higher priority when multiple ads compete for a slot */
    displayPriority: { type: Number, default: 0 },

    /**
     * Future scope: source of the ad. Manually created ads use "manual".
     * A future Google Ads integration can populate this as "google_ads"
     * along with a separate googleAdsConfig object, without altering
     * the fields above or any of the existing query/response shape.
     */
    adSource: { type: String, enum: ["manual", "google_ads"], default: "manual" },
    googleAdsConfig: { type: Schema.Types.Mixed, default: undefined },

    createdBy: {
      id: { type: String, default: "" },
      name: { type: String, default: "" },
      role: { type: String, default: "" },
    },
  },
  { timestamps: true, strict: false },
);

advertisementSchema.index({ displayLocation: 1, status: 1, startDate: 1, expiryDate: 1 });

advertisementSchema.statics.AD_TYPES = AD_TYPES;
advertisementSchema.statics.DISPLAY_LOCATIONS = DISPLAY_LOCATIONS;

module.exports = mongoose.model("Advertisement", advertisementSchema);