const mongoose = require("mongoose");

// Create a schema for image recommendations
const recommendationSchema = new mongoose.Schema({
  // Can be for registered user or guest
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
    index: true,
  },
  guestId: {
    type: String,
    required: false,
    index: true,
  },
  // The recommended image
  recommendedImageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "History",
    required: true,
  },
  recommendedImageUrl: {
    type: String,
    required: true,
  },
  // Score to rank recommendations (higher = more relevant)
  relevanceScore: {
    type: Number,
    required: true,
  },
  // Why this was recommended
  reason: {
    type: String,
    enum: [
      "similar-classification",
      "popular",
      "recently-viewed",
      "user-preference",
    ],
    required: true,
  },
  // When the recommendation was generated
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Whether the user acted on this recommendation
  wasViewed: {
    type: Boolean,
    default: false,
  },
});

// Validation to ensure either userId or guestId is provided
recommendationSchema.pre("save", function (next) {
  if (!this.userId && !this.guestId) {
    return next(
      new Error(
        "A recommendation must be associated with either a userId or guestId"
      )
    );
  }
  next();
});

module.exports = mongoose.model("Recommendation", recommendationSchema);
