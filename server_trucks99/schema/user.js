const mongoose = require('mongoose');
const findOrCreate = require('mongoose-findorcreate');
const { randomUUID } = require('crypto');

const Schema = mongoose.Schema;

// ── Purchased Subscription Sub-Schema ───────────────────────────────────────
const purchasedSubscriptionSchema = new Schema(
  {
    subscriptionItemId: {
      type: String,
      required: true,
      trim: true,
    },
    fieldName: {
      type: String,
      required: true,
      lowercase: true,
    },
    packageName: {
      type: String,
      required: true,
      trim: true,
    },
    packageType: {
      type: String,
      default: "",
      trim: true,
    },
    durationDays: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentId: {
      type: String,
      default: null,
      sparse: true,
    },
    orderId: {
      type: String,
      default: null,
      sparse: true,
    },
    purchasedAt: {
      type: Date,
      default: () => new Date(),
    },
    autoPay: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true, timestamps: true }
);

// ── Main User Schema ────────────────────────────────────────────────────────
const userSchema = new Schema({
    id: {
        type: String,
        default: randomUUID,
        unique: true,
        index: true
    },
    name: String,
    company_name: { type: String },
    profileImage: { type: String },
    email: { type: String },
    // Optional local password (Admin email/password login).
    // Same field names as passport-local-mongoose; excluded from queries by default.
    hash: { type: String, select: false },
    salt: { type: String, select: false },
    mobile: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role' },
    permissions: [{ type: Schema.Types.ObjectId, ref: 'Permission' }],
    permissionsMap: Schema.Types.Mixed,
    data: Schema.Types.Mixed,
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    termsAccepted: {
        type: Boolean,
        default: false,
    },
    // ── NEW: Track purchased subscriptions with payment info ──────────────
    purchasedSubscriptions: {
      type: [purchasedSubscriptionSchema],
      default: [],
    },
});

// ── Indexes for purchased subscriptions ─────────────────────────────────────
userSchema.index({ "purchasedSubscriptions.fieldName": 1 });
userSchema.index({ "purchasedSubscriptions.paymentId": 1 });
userSchema.index({ "purchasedSubscriptions.subscriptionItemId": 1 });
userSchema.index({ status: 1 });

userSchema.plugin(findOrCreate);

const User = mongoose.model('User', userSchema);

module.exports = User;