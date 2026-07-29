const mongoose = require("mongoose");
const { Schema } = mongoose;

const subscriptionItemSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    packageName: {
      type: String,
      required: [true, "packageName is required"],
      trim: true,
    },
    packageType: {
      type: String,
      required: [true, "packageType is required"],
      lowercase: true,
    },
    fieldName: {
      type: String,
      lowercase: true,
    },
    price: {
      type: Number,
      required: [true, "price is required"],
      min: [0, "price cannot be negative"],
    },
    durationDays: {
      type: Number,
      required: [true, "durationDays is required"],
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      lowercase: true,
    },
    description: String,
    features: [String],
  },
  { _id: true, timestamps: true },
);

const subscriptionSchema = new Schema(
  {
    subscriptions: {
      type: [subscriptionItemSchema],
      default: [],
    },
  },
  { timestamps: true },
);

// Auto-populate fieldName from packageType before saving
subscriptionSchema.pre("save", function (next) {
  if (this.subscriptions && this.subscriptions.length > 0) {
    this.subscriptions.forEach((item) => {
      // If fieldName is empty/not provided, auto-populate from packageType
      if (!item.fieldName && item.packageType) {
        item.fieldName = item.packageType.toLowerCase();
      }
    });
  }
  next();
});

// Index for faster queries
subscriptionSchema.index({ "subscriptions.fieldName": 1 });
subscriptionSchema.index({ "subscriptions.packageType": 1 });
subscriptionSchema.index({ "subscriptions.status": 1 });

module.exports = mongoose.model("Subscription", subscriptionSchema);