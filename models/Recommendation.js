const mongoose = require("mongoose");

const recommendationSchema = new mongoose.Schema(
  {
    // User identification - either userId OR guestId should be present
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    guestId: {
      type: String,
      default: null,
      index: true,
    },

    // The recommended image reference
    recommendedImageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "History", // References the History collection
      required: true,
      index: true,
    },

    // Cached image URL for quick access
    recommendedImageUrl: {
      type: String,
      required: true,
      trim: true,
    },

    // Recommendation scoring and relevance
    relevanceScore: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
      default: 50,
    },

    // Why this recommendation was made
    reason: {
      type: String,
      required: true,
      enum: [
        "similar-classification",
        "similar-content-type",
        "popular-general",
        "popular-content-type",
        "recent-activity",
        "user-preference",
        "fallback",
      ],
      default: "similar-classification",
    },

    // Content type that was requested (optional)
    sourceContentType: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },

    // Viewing status and tracking
    wasViewed: {
      type: Boolean,
      default: false,
      index: true,
    },

    viewedAt: {
      type: Date,
      default: null,
    },

    // Analytics tracking for views
    viewedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    viewedByGuestId: {
      type: String,
      default: null,
    },

    // Metadata for additional recommendation context
    metadata: {
      // Strategy used to generate this recommendation
      strategy: {
        type: String,
        enum: ["balanced", "recent_focused", "plant_only"],
        default: "balanced",
      },

      // Popularity data when recommendation was created
      popularityData: {
        score: { type: Number, default: 0 },
        count: { type: Number, default: 0 },
        avgConfidence: { type: Number, default: 0.5 },
      },

      // Similarity factors that contributed to the score
      scoringFactors: {
        plant_match: { type: Number, default: 0 },
        condition_match: { type: Number, default: 0 },
        confidence_boost: { type: Number, default: 0 },
        recency_boost: { type: Number, default: 0 },
        popularity_boost: { type: Number, default: 0 },
      },

      // Additional context
      userPatternMatch: {
        type: Boolean,
        default: false,
      },

      generationSource: {
        type: String,
        enum: ["similarity", "popularity", "fallback"],
        default: "similarity",
      },
    },

    // Performance and debugging
    generationTime: {
      type: Number, // milliseconds
      default: null,
    },

    // Expiration and cache management
    expiresAt: {
      type: Date,
      default: null,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL index
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    collection: "recommendations",
  }
);

// Compound indexes for efficient queries
recommendationSchema.index({ userId: 1, wasViewed: 1, createdAt: -1 });
recommendationSchema.index({ guestId: 1, wasViewed: 1, createdAt: -1 });
recommendationSchema.index({ userId: 1, sourceContentType: 1, wasViewed: 1 });
recommendationSchema.index({ guestId: 1, sourceContentType: 1, wasViewed: 1 });
recommendationSchema.index({ relevanceScore: -1, createdAt: -1 });
recommendationSchema.index({ recommendedImageId: 1, userId: 1 });
recommendationSchema.index({ recommendedImageId: 1, guestId: 1 });

// Ensure either userId or guestId is present, but not both
recommendationSchema.pre("save", function (next) {
  if (!this.userId && !this.guestId) {
    return next(new Error("Either userId or guestId must be provided"));
  }
  if (this.userId && this.guestId) {
    return next(new Error("Cannot have both userId and guestId"));
  }
  next();
});

// Pre-save middleware to set expiration
recommendationSchema.pre("save", function (next) {
  if (!this.expiresAt && this.isNew) {
    // Set recommendations to expire after 7 days by default
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 7);
    this.expiresAt = expireDate;
  }
  next();
});

// Instance methods
recommendationSchema.methods.markAsViewed = function (
  viewedByUserId = null,
  viewedByGuestId = null
) {
  this.wasViewed = true;
  this.viewedAt = new Date();
  if (viewedByUserId) this.viewedByUserId = viewedByUserId;
  if (viewedByGuestId) this.viewedByGuestId = viewedByGuestId;
  this.updatedAt = new Date();
  return this.save();
};

recommendationSchema.methods.updateRelevanceScore = function (newScore) {
  this.relevanceScore = Math.max(1, Math.min(100, newScore));
  this.updatedAt = new Date();
  return this.save();
};

recommendationSchema.methods.isExpired = function () {
  return this.expiresAt && new Date() > this.expiresAt;
};

recommendationSchema.methods.extendExpiration = function (days = 7) {
  const newExpireDate = new Date();
  newExpireDate.setDate(newExpireDate.getDate() + days);
  this.expiresAt = newExpireDate;
  return this.save();
};

// Static methods
recommendationSchema.statics.findForUser = function (userId, options = {}) {
  const query = { userId };
  if (options.wasViewed !== undefined) query.wasViewed = options.wasViewed;
  if (options.sourceContentType)
    query.sourceContentType = options.sourceContentType;

  return this.find(query)
    .sort({ relevanceScore: -1, createdAt: -1 })
    .limit(options.limit || 10)
    .populate("recommendedImageId", "classification imageUrl timestamp");
};

recommendationSchema.statics.findForGuest = function (guestId, options = {}) {
  const query = { guestId };
  if (options.wasViewed !== undefined) query.wasViewed = options.wasViewed;
  if (options.sourceContentType)
    query.sourceContentType = options.sourceContentType;

  return this.find(query)
    .sort({ relevanceScore: -1, createdAt: -1 })
    .limit(options.limit || 10)
    .populate("recommendedImageId", "classification imageUrl timestamp");
};

recommendationSchema.statics.getStatsForUser = function (userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalRecommendations: { $sum: 1 },
        viewedRecommendations: { $sum: { $cond: ["$wasViewed", 1, 0] } },
        avgRelevanceScore: { $avg: "$relevanceScore" },
        reasonBreakdown: { $push: "$reason" },
        strategyBreakdown: { $push: "$metadata.strategy" },
      },
    },
  ]);
};

recommendationSchema.statics.getStatsForGuest = function (guestId) {
  return this.aggregate([
    { $match: { guestId } },
    {
      $group: {
        _id: null,
        totalRecommendations: { $sum: 1 },
        viewedRecommendations: { $sum: { $cond: ["$wasViewed", 1, 0] } },
        avgRelevanceScore: { $avg: "$relevanceScore" },
        reasonBreakdown: { $push: "$reason" },
        strategyBreakdown: { $push: "$metadata.strategy" },
      },
    },
  ]);
};

recommendationSchema.statics.cleanupExpired = function () {
  return this.deleteMany({
    expiresAt: { $lt: new Date() },
  });
};

recommendationSchema.statics.findSimilarRecommendations = function (
  imageId,
  excludeIds = []
) {
  return this.find({
    recommendedImageId: imageId,
    _id: { $nin: excludeIds },
    wasViewed: false,
  })
    .sort({ relevanceScore: -1 })
    .limit(5);
};

// Virtual for user identity (returns userId or guestId)
recommendationSchema.virtual("userIdentity").get(function () {
  return this.userId || this.guestId;
});

recommendationSchema.virtual("userType").get(function () {
  return this.userId ? "user" : "guest";
});

// Virtual for age in hours
recommendationSchema.virtual("ageInHours").get(function () {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60));
});

// Virtual for view rate calculation (requires population of related recommendations)
recommendationSchema.virtual("isRecent").get(function () {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.createdAt > twentyFourHoursAgo;
});

// Transform output to include virtuals in JSON
recommendationSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  },
});

recommendationSchema.set("toObject", { virtuals: true });

// Post-save hook for logging (optional)
recommendationSchema.post("save", function (doc) {
  if (process.env.NODE_ENV === "development") {
    // console.log(
    //   `Recommendation saved: ${doc._id} for ${doc.userType} ${doc.userIdentity}`
    // );
  }
});

// Post-remove hook for cleanup (optional)
recommendationSchema.post("remove", function (doc) {
  // if (process.env.NODE_ENV === "development") {
  //   console.log(`Recommendation removed: ${doc._id}`);
  // }
});

const Recommendation = mongoose.model("Recommendation", recommendationSchema);

module.exports = Recommendation;
