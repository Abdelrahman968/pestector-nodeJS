const mongoose = require("mongoose");
const Notification = require("./Notification"); // Assuming you have a Notification model

const userSchema = new mongoose.Schema(
  {
    profileImage: { type: String, default: "/img/user-profile.png" },
    fullName: { type: String },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores",
      ],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      validate: {
        validator: function (email) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: "Invalid email format",
      },
    },

    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    linkedGuestId: { type: String },
    location: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
      lastUpdated: { type: Date },
    },
    twoFactorSecret: { type: String }, // Optional by default
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
      match: [/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"], // Using E.164 international format
    },
    // Subscription-related fields
    subscription: {
      currentPlan: {
        type: String,
        enum: ["free", "basic", "premium", "enterprise"],
        default: "free",
      },
      status: {
        type: String,
        enum: ["active", "canceled", "expired", "pending"],
        default: "active",
      },
      subscriptionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subscription",
      },
      features: {
        scanLimit: { type: Number, default: 10 },
        prioritySupport: { type: Boolean, default: false },
        advancedAnalytics: { type: Boolean, default: false },
        apiAccess: { type: Boolean, default: false },
      },
      expiresAt: { type: Date },
    },
    // New fields
    scanCount: { type: Number, default: 0 }, // Track the number of scans the user has performed
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

// Pre-save hook to update location timestamp
userSchema.pre("save", function (next) {
  if (this.isModified("location") && this.location) {
    this.location.lastUpdated = new Date(); // Update the timestamp when location is modified
  }
  next();
});

// Indexes to improve query performance for common fields
// userSchema.index({ username: 1 });
// userSchema.index({ email: 1 });
// userSchema.index({ phoneNumber: 1 });
userSchema.index({ "subscription.subscriptionId": 1 });
userSchema.index({ "subscription.expiresAt": 1 });

// Virtual to check if subscription is active
userSchema.virtual("hasActiveSubscription").get(function () {
  if (!this.subscription || !this.subscription.expiresAt) return false;
  return (
    this.subscription.status === "active" &&
    this.subscription.expiresAt > new Date()
  );
});

// Virtual to get notifications count
userSchema.virtual("unreadNotificationsCount").get(async function () {
  const unreadNotifications = await Notification.countDocuments({
    userId: this._id,
    read: false,
  });
  return unreadNotifications;
});

// Method to check if user has access to a specific feature
userSchema.methods.hasFeatureAccess = function (featureName) {
  if (!this.subscription || !this.subscription.features) return false;
  return !!this.subscription.features[featureName];
};

// Method to get notifications for the user
userSchema.methods.getNotifications = function (limit = 20, offset = 0) {
  return Notification.find({ userId: this._id })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);
};

// Update the user's scanCount when needed
userSchema.methods.updateScanCount = async function () {
  const scanCount = await mongoose
    .model("History")
    .countDocuments({ userId: this._id });
  this.scanCount = scanCount;
  await this.save();
};

// Method to increment scan count
userSchema.methods.incrementScanCount = async function () {
  if (this.scanCount < this.subscription.features.scanLimit) {
    this.scanCount += 1;
    await this.save();
  } else {
    throw new Error("Scan limit exceeded for your subscription plan.");
  }
};

module.exports = mongoose.model("User", userSchema);
