const mongoose = require("mongoose");
const { Schema } = mongoose;

// ── Active Subscription Sub-Schema ──────────────────────────────────────────
const activeSubscriptionSchema = new Schema(
  {
    subscriptionItemId: {
      type: String,
      required: [true, "subscriptionItemId is required"],
      trim: true,
    },
    fieldName: {
      type: String,
      required: [true, "fieldName is required"],
      enum: ["load", "truck", "product"],
      lowercase: true,
    },
    packageName: {
      type: String,
      required: [true, "packageName is required"],
      trim: true,
    },
    packageType: {
      type: String,
      default: "",
      trim: true,
    },
    durationDays: {
      type: Number,
      required: [true, "durationDays is required"],
      min: [1, "durationDays must be at least 1"],
    },
    price: {
      type: Number,
      required: [true, "price is required"],
      min: [0, "price cannot be negative"],
    },
    startDate: {
      type: Date,
      required: [true, "startDate is required"],
      default: () => new Date(),
    },
    endDate: {
      type: Date,
      required: [true, "endDate is required"],
      validate: {
        validator: function (value) {
          return value > this.startDate;
        },
        message: "endDate must be after startDate",
      },
    },
    status: {
      type: String,
      enum: {
        values: ["active", "expired", "cancelled"],
        message: "{VALUE} is not a valid status",
      },
      default: "active",
      lowercase: true,
    },
    razorpayOrderId: {
      type: String,
      default: null,
      sparse: true,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
      sparse: true,
    },
    assignedByAdmin: {
      type: Boolean,
      default: false,
    },
    autoPay: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: true,
    timestamps: true,
  },
);

// ── Virtual: Check if subscription is currently active ────────────────────
activeSubscriptionSchema.virtual("isCurrentlyActive").get(function () {
  const now = new Date();
  return (
    this.status === "active" &&
    new Date(this.startDate) <= now &&
    new Date(this.endDate) >= now
  );
});

// ── Virtual: Days remaining ─────────────────────────────────────────────────
activeSubscriptionSchema.virtual("daysRemaining").get(function () {
  const now = new Date();
  if (!this.isCurrentlyActive) return 0;
  const msRemaining = new Date(this.endDate) - now;
  return Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
});

// ── Instance method: Mark as expired ────────────────────────────────────────
activeSubscriptionSchema.methods.markExpired = function () {
  if (new Date(this.endDate) < new Date()) {
    this.status = "expired";
  }
  return this.status;
};

// ── Main User Subscription Schema ───────────────────────────────────────────
const userSubscriptionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.Mixed,
      required: [true, "userId is required"],
      unique: true,
      sparse: true,
    },
    activeSubscriptions: {
      type: [activeSubscriptionSchema],
      default: [],
      validate: {
        validator: function (arr) {
          return Array.isArray(arr);
        },
        message: "activeSubscriptions must be an array",
      },
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
// userId index already created by `unique: true` in schema definition
userSubscriptionSchema.index({ "activeSubscriptions.status": 1 });
userSubscriptionSchema.index({ "activeSubscriptions.endDate": 1 });
userSubscriptionSchema.index({ "activeSubscriptions.fieldName": 1 });
userSubscriptionSchema.index({ createdAt: 1 });

// ── Static method: Get active subscriptions for user ────────────────────────
userSubscriptionSchema.statics.getActiveSubscriptionsForUser = async function (userId) {
  const doc = await this.findOne({ userId }).lean();
  if (!doc) return [];

  const now = new Date();
  return (doc.activeSubscriptions || []).filter((sub) => {
    return (
      sub.status === "active" &&
      new Date(sub.startDate) <= now &&
      new Date(sub.endDate) >= now
    );
  });
};

// ── Static method: Get subscriptions by field (e.g., "truck", "load") ──────
userSubscriptionSchema.statics.getSubscriptionsByField = async function (
  userId,
  fieldName
) {
  const active = await this.getActiveSubscriptionsForUser(userId);
  return active.filter((sub) => sub.fieldName === fieldName);
};

// ── Static method: Check if user has active subscription for field ─────────
userSubscriptionSchema.statics.hasActiveSubscription = async function (
  userId,
  fieldName
) {
  const subs = await this.getSubscriptionsByField(userId, fieldName);
  return subs.length > 0;
};

// ── Static method: Auto-expire old subscriptions ────────────────────────────
userSubscriptionSchema.statics.autoExpireSubscriptions = async function () {
  const now = new Date();
  const result = await this.updateMany(
    {
      "activeSubscriptions.status": "active",
      "activeSubscriptions.endDate": { $lt: now },
    },
    {
      $set: { "activeSubscriptions.$[elem].status": "expired" },
    },
    {
      arrayFilters: [{ "elem.status": "active", "elem.endDate": { $lt: now } }],
    }
  );
  return result;
};

// ── Instance method: Get user's active subscriptions ───────────────────────
userSubscriptionSchema.methods.getActiveSubscriptions = function () {
  const now = new Date();
  return (this.activeSubscriptions || []).filter((sub) => {
    return (
      sub.status === "active" &&
      new Date(sub.startDate) <= now &&
      new Date(sub.endDate) >= now
    );
  });
};

// ── Instance method: Check if subscription exists for field ───────────────
userSubscriptionSchema.methods.hasSubscriptionFor = function (fieldName) {
  return this.getActiveSubscriptions().some(
    (sub) => sub.fieldName === fieldName
  );
};

module.exports = mongoose.model("UserSubscription", userSubscriptionSchema);