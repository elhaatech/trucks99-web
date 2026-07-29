const mongoose = require("mongoose");
const { Schema } = mongoose;

const transactionSchema = new Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String, // String to handle UUID or ObjectId depending on setup
  },
  packageId: {
    type: String,
    required: true
  },
  /** Buy & Sell listing id when paying for "Feature Your Vehicle". */
  buySellProductId: {
    type: String,
    default: null,
    index: true,
  },
  packageDuration: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ["created", "success", "failed"],
    default: "created"
  },
  paymentId: {
    type: String,
    default: null
  },
  errorDetails: {
    type: String,
    default: null
  },
  orderDetails: {
    type: Schema.Types.Mixed,
    default: {}
  },
  paymentDetails: {
    type: Schema.Types.Mixed,
    default: {}
  },
  razorpayResponse: {
    type: Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

transactionSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Transaction", transactionSchema);
