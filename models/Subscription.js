const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  plan: {
    type: String,
    enum: ["free", "basic", "premium", "enterprise"],
    default: "free",
  },
  previousPlan: {
    type: String,
    enum: ["free", "basic", "premium", "enterprise", null],
    default: null,
  },
  status: {
    type: String,
    enum: ["active", "canceled", "expired", "pending"],
    default: "active",
  },
  features: {
    scanLimit: { type: Number, default: 10 },
    prioritySupport: { type: Boolean, default: false },
    advancedAnalytics: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
  },
  paymentDetails: { type: Object, default: {} },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  autoRenew: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

subscriptionSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Subscription", subscriptionSchema);
