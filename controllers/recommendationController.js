const Recommendation = require("../models/Recommendation");
const recommendationEngine = require("../utils/recommendationEngine");
const { v4: uuidv4 } = require("uuid"); // Make sure to install this package

/**
 * Controller for handling recommendation-related requests
 */
const recommendationController = {
  /**
   * Get recommendations for a user or guest
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getRecommendations(req, res) {
    try {
      let { userId, guestId, limit = 5 } = req.query;

      // Handle authentication integration
      if (req.user && !userId) {
        // Use the authenticated user's ID
        userId = req.user.id;
      } else if (req.isGuest && !guestId) {
        // Check for guest ID in cookies or generate a new one
        guestId = req.cookies?.guestId || uuidv4();

        // Set a cookie with the guest ID if it's new
        if (!req.cookies?.guestId) {
          res.cookie("guestId", guestId, {
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            httpOnly: true,
          });
        }
      }

      // Validate that either userId or guestId is now available
      if (!userId && !guestId) {
        return res.status(400).json({
          success: false,
          message:
            "Could not determine user identity. Please provide userId or guestId.",
        });
      }

      // Get recommendations using the engine
      const recommendations = await recommendationEngine.getRecommendations({
        userId,
        guestId,
        limit: parseInt(limit),
      });

      return res.status(200).json({
        success: true,
        count: recommendations.length,
        data: recommendations,
      });
    } catch (error) {
      console.error("Error getting recommendations:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to get recommendations",
        error: error.message,
      });
    }
  },

  /**
   * Mark a recommendation as viewed
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async markRecommendationAsViewed(req, res) {
    try {
      const { recommendationId } = req.params;

      if (!recommendationId) {
        return res.status(400).json({
          success: false,
          message: "Recommendation ID is required",
        });
      }

      // Mark recommendation as viewed
      const updatedRecommendation = await recommendationEngine.markAsViewed(
        recommendationId
      );

      if (!updatedRecommendation) {
        return res.status(404).json({
          success: false,
          message: "Recommendation not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: updatedRecommendation,
      });
    } catch (error) {
      console.error("Error marking recommendation as viewed:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to mark recommendation as viewed",
        error: error.message,
      });
    }
  },

  /**
   * Get recommendations for specific content type
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getContentTypeRecommendations(req, res) {
    try {
      let { userId, guestId, contentType, limit = 5 } = req.query;

      // Handle authentication integration
      if (req.user && !userId) {
        userId = req.user.id;
      } else if (req.isGuest && !guestId) {
        guestId = req.cookies?.guestId || uuidv4();

        if (!req.cookies?.guestId) {
          res.cookie("guestId", guestId, {
            maxAge: 30 * 24 * 60 * 60 * 1000,
            httpOnly: true,
          });
        }
      }

      // Validate required parameters
      if (!userId && !guestId) {
        return res.status(400).json({
          success: false,
          message:
            "Could not determine user identity. Please provide userId or guestId.",
        });
      }

      if (!contentType) {
        return res.status(400).json({
          success: false,
          message: "Content type is required",
        });
      }

      // Define a query filter based on content type
      const query = {
        ...(userId ? { userId } : { guestId }),
        wasViewed: false,
      };

      // Get recommendations from database
      const recommendations = await Recommendation.find(query)
        .sort({ relevanceScore: -1 })
        .limit(parseInt(limit));

      // If not enough recommendations, generate new ones
      // Implementation would depend on how you want to filter by content type

      return res.status(200).json({
        success: true,
        count: recommendations.length,
        data: recommendations,
      });
    } catch (error) {
      console.error("Error getting content type recommendations:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to get content type recommendations",
        error: error.message,
      });
    }
  },

  /**
   * Refresh recommendations for a user or guest
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async refreshRecommendations(req, res) {
    try {
      let { userId, guestId, limit = 5 } = req.body;

      // Handle authentication integration
      if (req.user && !userId) {
        userId = req.user.id;
      } else if (req.isGuest && !guestId) {
        guestId = req.cookies?.guestId || uuidv4();

        if (!req.cookies?.guestId) {
          res.cookie("guestId", guestId, {
            maxAge: 30 * 24 * 60 * 60 * 1000,
            httpOnly: true,
          });
        }
      }

      // Validate that either userId or guestId is now available
      if (!userId && !guestId) {
        return res.status(400).json({
          success: false,
          message:
            "Could not determine user identity. Please provide userId or guestId.",
        });
      }

      // Delete existing recommendations
      await Recommendation.deleteMany({
        ...(userId ? { userId } : { guestId }),
        wasViewed: false,
      });

      // Generate fresh recommendations
      const recommendations =
        await recommendationEngine.generateRecommendations({
          userId,
          guestId,
          limit: parseInt(limit),
        });

      return res.status(200).json({
        success: true,
        message: "Recommendations refreshed successfully",
        count: recommendations.length,
        data: recommendations,
      });
    } catch (error) {
      console.error("Error refreshing recommendations:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to refresh recommendations",
        error: error.message,
      });
    }
  },
};

module.exports = recommendationController;
