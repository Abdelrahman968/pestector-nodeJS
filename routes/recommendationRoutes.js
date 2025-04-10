const express = require("express");
const router = express.Router();
const recommendationController = require("../controllers/recommendationController");
const authenticateToken = require("../middleware/auth");

/**
 * Routes for recommendation system
 */

/**
 * @route   GET /api/recommendations
 * @desc    Get recommendations for a user or guest
 * @access  Public (handles both authenticated users and guests)
 * @query   {string} [userId] - Optional User ID for registered users
 * @query   {string} [guestId] - Optional Guest ID for non-registered users
 * @query   {number} [limit=5] - Maximum number of recommendations to return
 */
router.get("/", authenticateToken, recommendationController.getRecommendations);

/**
 * @route   PUT /api/recommendations/:recommendationId/view
 * @desc    Mark a recommendation as viewed
 * @access  Public (handles both authenticated users and guests)
 * @param   {string} recommendationId - The recommendation ID to mark as viewed
 */
router.put(
  "/:recommendationId/view",
  authenticateToken,
  recommendationController.markRecommendationAsViewed
);

/**
 * @route   GET /api/recommendations/content-type
 * @desc    Get recommendations for specific content type
 * @access  Public (handles both authenticated users and guests)
 * @query   {string} [userId] - Optional User ID for registered users
 * @query   {string} [guestId] - Optional Guest ID for non-registered users
 * @query   {string} contentType - Type of content to recommend
 * @query   {number} [limit=5] - Maximum number of recommendations to return
 */
router.get(
  "/content-type",
  authenticateToken,
  recommendationController.getContentTypeRecommendations
);

/**
 * @route   POST /api/recommendations/refresh
 * @desc    Refresh recommendations for a user or guest
 * @access  Public (handles both authenticated users and guests)
 * @body    {string} [userId] - Optional User ID for registered users
 * @body    {string} [guestId] - Optional Guest ID for non-registered users
 * @body    {number} [limit=5] - Maximum number of recommendations to return
 */
router.post(
  "/refresh",
  authenticateToken,
  recommendationController.refreshRecommendations
);

module.exports = router;
