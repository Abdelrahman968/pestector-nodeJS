const express = require("express");
const router = express.Router();
const recommendationController = require("../controllers/recommendationController");

// Middleware imports
const authenticateToken = require("../middleware/auth");
const { getGuestId, trackGuestScan } = require("../middleware/guest");

// Combined authentication middleware for recommendations
const authenticateOrGuest = [authenticateToken, getGuestId];

// Rate limiting middleware for recommendations
const recommendationRateLimit = (req, res, next) => {
  // Basic rate limiting logic - adjust as needed
  // You can implement more sophisticated rate limiting here
  next();
};

// Validation middleware for request parameters
const validateRecommendationParams = (req, res, next) => {
  const { limit, strategy, refreshAge } = req.query;

  // Validate limit
  if (
    limit &&
    (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 50)
  ) {
    return res.status(400).json({
      success: false,
      message: "Limit must be a number between 1 and 50",
    });
  }

  // Validate strategy
  const validStrategies = ["balanced", "recent_focused", "plant_only"];
  if (strategy && !validStrategies.includes(strategy)) {
    return res.status(400).json({
      success: false,
      message: `Invalid strategy. Must be one of: ${validStrategies.join(
        ", "
      )}`,
    });
  }

  // Validate refreshAge
  if (refreshAge && (isNaN(parseInt(refreshAge)) || parseInt(refreshAge) < 1)) {
    return res.status(400).json({
      success: false,
      message: "RefreshAge must be a positive number",
    });
  }

  next();
};

const validateRecommendationId = (req, res, next) => {
  const { recommendationId } = req.params;

  if (
    !recommendationId ||
    typeof recommendationId !== "string" ||
    recommendationId.length !== 24
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid recommendation ID format",
    });
  }

  next();
};

const validateGenerateParams = (req, res, next) => {
  const { limit, strategy } = req.body;

  // Validate limit
  if (
    limit &&
    (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 50)
  ) {
    return res.status(400).json({
      success: false,
      message: "Limit must be a number between 1 and 50",
    });
  }

  // Validate strategy
  const validStrategies = ["balanced", "recent_focused", "plant_only"];
  if (strategy && !validStrategies.includes(strategy)) {
    return res.status(400).json({
      success: false,
      message: `Invalid strategy. Must be one of: ${validStrategies.join(
        ", "
      )}`,
    });
  }

  next();
};

// Middleware to ensure user identity (either authenticated user or guest)
const ensureUserIdentity = (req, res, next) => {
  if (!req.user && !req.guestId) {
    return res.status(400).json({
      success: false,
      message:
        "User identity required. Please authenticate or accept guest session.",
    });
  }
  next();
};

// Apply global middleware to all routes
router.use(authenticateOrGuest);
router.use(recommendationRateLimit);

/**
 * @route   GET /api/recommendations
 * @desc    Get recommendations for user/guest with filtering options
 * @access  Public (requires user/guest identity)
 * @params  limit, contentType, viewed, strategy, refreshAge
 */
router.get(
  "/",
  ensureUserIdentity,
  validateRecommendationParams,
  recommendationController.getRecommendations
);

/**
 * @route   POST /api/recommendations/generate
 * @desc    Generate fresh recommendations
 * @access  Public (requires user/guest identity)
 * @body    limit, contentType, strategy, force
 */
router.post(
  "/generate",
  ensureUserIdentity,
  validateGenerateParams,
  recommendationController.generateRecommendations
);

/**
 * @route   GET /api/recommendations/stats
 * @desc    Get recommendation statistics for user/guest
 * @access  Public (requires user/guest identity)
 */
router.get(
  "/stats",
  ensureUserIdentity,
  recommendationController.getRecommendationStats
);

/**
 * @route   GET /api/recommendations/:recommendationId
 * @desc    Get detailed information about a specific recommendation
 * @access  Public (requires user/guest identity)
 */
router.get(
  "/:recommendationId",
  ensureUserIdentity,
  validateRecommendationId,
  recommendationController.getRecommendationById
);

/**
 * @route   PUT /api/recommendations/:recommendationId/viewed
 * @desc    Mark a recommendation as viewed
 * @access  Public (requires user/guest identity)
 */
router.put(
  "/:recommendationId/viewed",
  ensureUserIdentity,
  validateRecommendationId,
  recommendationController.markAsViewed
);

/**
 * @route   DELETE /api/recommendations
 * @desc    Delete recommendations (specific IDs or by criteria)
 * @access  Public (requires user/guest identity)
 * @body    recommendationIds (optional), deleteViewed
 */
router.delete(
  "/",
  ensureUserIdentity,
  recommendationController.deleteRecommendations
);

/**
 * @route   POST /api/recommendations/cache/clear
 * @desc    Clear recommendation caches (admin/development)
 * @access  Admin only
 */
router.post(
  "/cache/clear",
  // Only authenticated users can clear cache
  (req, res, next) => {
    if (req.isGuest) {
      return res.status(403).json({
        success: false,
        message: "Admin access required to clear cache",
      });
    }
    next();
  },
  recommendationController.clearCache
);

// Additional routes can be added here when controller methods are implemented
//
// /**
//  * @route   GET /api/recommendations/user/profile
//  * @desc    Get user's recommendation profile and preferences
//  * @access  Public (requires user/guest identity)
//  */
// router.get(
//   "/user/profile",
//   ensureUserIdentity,
//   recommendationController.getUserRecommendationProfile
// );
//
// /**
//  * @route   PUT /api/recommendations/user/preferences
//  * @desc    Update user's recommendation preferences
//  * @access  Public (requires user/guest identity)
//  * @body    preferences object
//  */
// router.put(
//   "/user/preferences",
//   ensureUserIdentity,
//   (req, res, next) => {
//     // Validate preferences object
//     const { preferences } = req.body;
//     if (!preferences || typeof preferences !== 'object') {
//       return res.status(400).json({
//         success: false,
//         message: "Valid preferences object required",
//       });
//     }
//     next();
//   },
//   recommendationController.updateUserPreferences
// );

// Error handling middleware for recommendation routes
router.use((error, req, res, next) => {
  console.error("Recommendation route error:", error);

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      details: error.message,
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
    });
  }

  if (error.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid authentication token",
    });
  }

  if (error.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Authentication token expired",
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal server error in recommendations",
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});

// 404 handler for recommendation routes
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Recommendation endpoint not found",
    availableEndpoints: [
      "GET /api/recommendations",
      "POST /api/recommendations/generate",
      "GET /api/recommendations/stats",
      "GET /api/recommendations/:id",
      "PUT /api/recommendations/:id/viewed",
      "DELETE /api/recommendations",
      "POST /api/recommendations/cache/clear",
    ],
  });
});

module.exports = router;
