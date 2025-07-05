const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
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
    min: 0,
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
    default: null,
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
  scanUsage: [
    {
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

// Update updatedAt and set defaults for free plan
subscriptionSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  if (this.isNew && this.plan === "free") {
    // Only reset for new free plan subscriptions
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
    this.scanUsage = this.scanUsage || []; // Preserve existing scanUsage
  }
  next();
});

// Method to reset scan usage at the start of a new billing cycle
subscriptionSchema.methods.resetScanUsage = function () {
  this.scanUsage = [];
};

// Method to count scans in the current billing cycle
subscriptionSchema.methods.getCurrentScanCount = function () {
  const now = new Date();
  const cycleStart = new Date(this.startDate);
  if (this.cycle === "monthly") {
    cycleStart.setMonth(now.getMonth());
    cycleStart.setFullYear(now.getFullYear());
    if (cycleStart > now) {
      cycleStart.setMonth(cycleStart.getMonth() - 1);
    }
  } else if (this.cycle === "yearly") {
    cycleStart.setFullYear(now.getFullYear());
    if (cycleStart > now) {
      cycleStart.setFullYear(cycleStart.getFullYear() - 1);
    }
  }
  return this.scanUsage.filter((scan) => scan.timestamp >= cycleStart).length;
};

subscriptionSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model("Subscription", subscriptionSchema);
