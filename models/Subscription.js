const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true, // Improve query performance
  },
  plan: {
    type: String,
    required: true,
    default: "free",
  },
  previousPlan: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ["active", "canceled", "expired", "pending"],
    default: "active",
  },
  features: {
    scanLimit: { type: Number, required: true },
    prioritySupport: { type: Boolean, default: false },
    advancedAnalytics: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
  },
  cycle: {
    type: String,
    enum: ["monthly", "yearly"],
    default: "monthly",
  },
  discount: {
    type: Number,
    default: 0,
    min: 0, // Ensure non-negative discounts
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
    default: null, // Allow null for free plans
  },
  autoRenew: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update updatedAt before saving
subscriptionSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  // Set defaults for free plan
  if (this.plan === "free") {
    this.features = {
      scanLimit: 10,
      prioritySupport: false,
      advancedAnalytics: false,
      apiAccess: false,
    };
    this.endDate = null;
    this.discount = 0;
    this.cycle = "monthly";
    this.autoRenew = false;
  }
  next();
});

// Ensure indexes for common queries
subscriptionSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model("Subscription", subscriptionSchema);
