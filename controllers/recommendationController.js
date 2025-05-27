const Recommendation = require("../models/Recommendation");
const recommendationEngine = require("../utils/recommendationEngine");

/**
 * Enhanced controller for handling recommendation-related requests
 */
const recommendationController = {
  /**
   * Get recommendations with enhanced filtering and strategy options
   */
  async getRecommendations(req, res) {
    try {
      let {
        userId,
        guestId,
        limit = 8,
        contentType,
        viewed,
        strategy = "balanced",
        refreshAge = 24,
      } = req.query;

      // Determine user identity from middleware
      if (req.user && req.user.id) {
        userId = req.user.id;
        guestId = undefined;
      } else if (req.isGuest && req.guestId) {
        guestId = req.guestId;
        userId = undefined;
      } else if (req.isGuest && !req.guestId && req.cookies?.guestId) {
        guestId = req.cookies.guestId;
        userId = undefined;
        console.warn(
          "Controller: Using guestId from cookie as req.guestId was not set by middleware."
        );
      } else if (req.isGuest) {
        console.error("Controller: Guest user detected but no guestId found.");
        return res.status(400).json({
          success: false,
          message: "Guest identity could not be established.",
        });
      }

      if (!userId && !guestId) {
        return res.status(400).json({
          success: false,
          message:
            "Could not determine user identity. Please log in or ensure guest session is active.",
        });
      }

      const parsedLimit = Math.max(1, Math.min(50, parseInt(limit))) || 8; // Limit between 1-50
      const fetchViewed = viewed === "true";
      const parsedRefreshAge = Math.max(1, parseInt(refreshAge)) || 24;

      // console.log(
      //   `Enhanced Ctrl: GET /recs. User:${userId}, Guest:${guestId}, Lim:${parsedLimit}, Type:${contentType}, Viewed:${fetchViewed}, Strategy:${strategy}`
      // );

      // Validate strategy parameter
      const validStrategies = ["balanced", "recent_focused", "plant_only"];
      const validatedStrategy = validStrategies.includes(strategy)
        ? strategy
        : "balanced";

      if (strategy !== validatedStrategy) {
        console.warn(
          `Invalid strategy '${strategy}' provided, using 'balanced' instead`
        );
      }

      // Get recommendations using enhanced engine
      const recommendations = await recommendationEngine.getRecommendations({
        userId,
        guestId,
        limit: parsedLimit,
        refreshAge: parsedRefreshAge,
        contentType: contentType || null,
        fetchViewed,
        strategy: validatedStrategy,
      });

      // Format response with enhanced metadata
      const formattedRecommendations = recommendations.map((rec) => ({
        id: rec._id,
        imageId: rec.recommendedImageId?._id || rec.recommendedImageId,
        imageUrl: rec.recommendedImageUrl,
        relevanceScore: rec.relevanceScore,
        reason: rec.reason,
        contentType: rec.sourceContentType,
        wasViewed: rec.wasViewed,
        createdAt: rec.createdAt,
        metadata: rec.metadata || {},
        classification: rec.recommendedImageId?.classification || null,
      }));

      // Get recommendation stats for debugging/monitoring
      const stats = await recommendationEngine.getRecommendationStats(
        userId,
        guestId
      );

      res.json({
        success: true,
        recommendations: formattedRecommendations,
        total: formattedRecommendations.length,
        strategy: validatedStrategy,
        stats: {
          totalRecommendations: stats.totalRecommendations,
          viewRate: Math.round(stats.viewRate),
          avgRelevanceScore: stats.avgRelevanceScore,
        },
      });
    } catch (error) {
      console.error("Error in getRecommendations:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch recommendations",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  /**
   * Mark recommendation as viewed with enhanced tracking
   */
  async markAsViewed(req, res) {
    try {
      const { recommendationId } = req.params;
      let { userId, guestId } = req.body;

      // Override with authenticated user data if available
      if (req.user && req.user.id) {
        userId = req.user.id;
        guestId = undefined;
      } else if (req.isGuest && req.guestId) {
        guestId = req.guestId;
        userId = undefined;
      }

      if (!recommendationId) {
        return res.status(400).json({
          success: false,
          message: "Recommendation ID is required",
        });
      }

      if (!userId && !guestId) {
        return res.status(400).json({
          success: false,
          message: "User identity required to mark as viewed",
        });
      }

      // console.log(
      //   `Marking recommendation ${recommendationId} as viewed for ${
      //     userId ? `user ${userId}` : `guest ${guestId}`
      //   }`
      // );

      const updatedRecommendation = await recommendationEngine.markAsViewed(
        recommendationId,
        userId,
        guestId
      );

      if (!updatedRecommendation) {
        return res.status(404).json({
          success: false,
          message: "Recommendation not found",
        });
      }

      res.json({
        success: true,
        message: "Recommendation marked as viewed",
        recommendation: {
          id: updatedRecommendation._id,
          wasViewed: updatedRecommendation.wasViewed,
          viewedAt: updatedRecommendation.viewedAt,
        },
      });
    } catch (error) {
      console.error("Error in markAsViewed:", error);
      res.status(500).json({
        success: false,
        message: "Failed to mark recommendation as viewed",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  /**
   * Generate fresh recommendations with enhanced options
   */
  async generateRecommendations(req, res) {
    try {
      let { userId, guestId } = req.body;
      const {
        limit = 8,
        contentType,
        strategy = "balanced",
        force = false,
      } = req.body;

      // Determine user identity
      if (req.user && req.user.id) {
        userId = req.user.id;
        guestId = undefined;
      } else if (req.isGuest && req.guestId) {
        guestId = req.guestId;
        userId = undefined;
      }

      if (!userId && !guestId) {
        return res.status(400).json({
          success: false,
          message: "User identity required to generate recommendations",
        });
      }

      const parsedLimit = Math.max(1, Math.min(50, parseInt(limit))) || 8;
      const validStrategies = ["balanced", "recent_focused", "plant_only"];
      const validatedStrategy = validStrategies.includes(strategy)
        ? strategy
        : "balanced";

      // console.log(
      //   `Generating recommendations for ${
      //     userId ? `user ${userId}` : `guest ${guestId}`
      //   } with strategy: ${validatedStrategy}`
      // );

      // Clear old recommendations if force is true
      if (force) {
        await Recommendation.deleteMany({
          ...(userId ? { userId } : { guestId }),
          wasViewed: false,
        });
        // console.log("Cleared existing unviewed recommendations");
      }

      const newRecommendations =
        await recommendationEngine.generateRecommendations({
          userId,
          guestId,
          limit: parsedLimit,
          contentType: contentType || null,
          strategy: validatedStrategy,
        });

      const formattedRecommendations = newRecommendations.map((rec) => ({
        id: rec._id,
        imageId: rec.recommendedImageId,
        imageUrl: rec.recommendedImageUrl,
        relevanceScore: rec.relevanceScore,
        reason: rec.reason,
        contentType: rec.sourceContentType,
        metadata: rec.metadata || {},
      }));

      res.json({
        success: true,
        message: `Generated ${newRecommendations.length} new recommendations`,
        recommendations: formattedRecommendations,
        strategy: validatedStrategy,
        total: newRecommendations.length,
      });
    } catch (error) {
      console.error("Error in generateRecommendations:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate recommendations",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  /**
   * Get detailed recommendation statistics
   */
  async getRecommendationStats(req, res) {
    try {
      let { userId, guestId } = req.query;

      // Determine user identity
      if (req.user && req.user.id) {
        userId = req.user.id;
        guestId = undefined;
      } else if (req.isGuest && req.guestId) {
        guestId = req.guestId;
        userId = undefined;
      }

      if (!userId && !guestId) {
        return res.status(400).json({
          success: false,
          message: "User identity required to get recommendation stats",
        });
      }

      const stats = await recommendationEngine.getRecommendationStats(
        userId,
        guestId
      );

      res.json({
        success: true,
        stats: {
          ...stats,
          viewRate: Math.round(stats.viewRate * 100) / 100, // Round to 2 decimal places
          avgRelevanceScore: Math.round(stats.avgRelevanceScore),
        },
        userId: userId || null,
        guestId: guestId || null,
      });
    } catch (error) {
      console.error("Error in getRecommendationStats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get recommendation statistics",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  /**
   * Clear recommendation cache (admin/development endpoint)
   */
  async clearCache(req, res) {
    try {
      // Add admin authentication check here if needed
      // if (!req.user || !req.user.isAdmin) {
      //   return res.status(403).json({ success: false, message: "Admin access required" });
      // }

      recommendationEngine.clearCaches();

      res.json({
        success: true,
        message: "Recommendation caches cleared successfully",
      });
    } catch (error) {
      console.error("Error in clearCache:", error);
      res.status(500).json({
        success: false,
        message: "Failed to clear cache",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  /**
   * Delete specific recommendations
   */
  async deleteRecommendations(req, res) {
    try {
      let { userId, guestId } = req.body;
      const { recommendationIds, deleteViewed = false } = req.body;

      // Determine user identity
      if (req.user && req.user.id) {
        userId = req.user.id;
        guestId = undefined;
      } else if (req.isGuest && req.guestId) {
        guestId = req.guestId;
        userId = undefined;
      }

      if (!userId && !guestId) {
        return res.status(400).json({
          success: false,
          message: "User identity required to delete recommendations",
        });
      }

      let deleteQuery = {
        ...(userId ? { userId } : { guestId }),
      };

      // If specific recommendation IDs are provided
      if (
        recommendationIds &&
        Array.isArray(recommendationIds) &&
        recommendationIds.length > 0
      ) {
        deleteQuery._id = { $in: recommendationIds };
      } else {
        // Otherwise delete based on viewed status
        if (!deleteViewed) {
          deleteQuery.wasViewed = false;
        }
      }

      const deleteResult = await Recommendation.deleteMany(deleteQuery);

      res.json({
        success: true,
        message: `Deleted ${deleteResult.deletedCount} recommendations`,
        deletedCount: deleteResult.deletedCount,
      });
    } catch (error) {
      console.error("Error in deleteRecommendations:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete recommendations",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  /**
   * Get recommendation details by ID
   */
  async getRecommendationById(req, res) {
    try {
      const { recommendationId } = req.params;
      let { userId, guestId } = req.query;

      // Determine user identity
      if (req.user && req.user.id) {
        userId = req.user.id;
        guestId = undefined;
      } else if (req.isGuest && req.guestId) {
        guestId = req.guestId;
        userId = undefined;
      }

      if (!recommendationId) {
        return res.status(400).json({
          success: false,
          message: "Recommendation ID is required",
        });
      }

      const recommendation = await Recommendation.findOne({
        _id: recommendationId,
        ...(userId ? { userId } : { guestId }),
      }).populate("recommendedImageId", "classification imageUrl timestamp");

      if (!recommendation) {
        return res.status(404).json({
          success: false,
          message: "Recommendation not found",
        });
      }

      res.json({
        success: true,
        recommendation: {
          id: recommendation._id,
          imageId:
            recommendation.recommendedImageId?._id ||
            recommendation.recommendedImageId,
          imageUrl: recommendation.recommendedImageUrl,
          relevanceScore: recommendation.relevanceScore,
          reason: recommendation.reason,
          contentType: recommendation.sourceContentType,
          wasViewed: recommendation.wasViewed,
          createdAt: recommendation.createdAt,
          updatedAt: recommendation.updatedAt,
          viewedAt: recommendation.viewedAt,
          metadata: recommendation.metadata || {},
          classification:
            recommendation.recommendedImageId?.classification || null,
        },
      });
    } catch (error) {
      console.error("Error in getRecommendationById:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get recommendation details",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },
};

module.exports = recommendationController;
