const History = require("../models/History");
const Recommendation = require("../models/Recommendation");

/**
 * Recommendation engine to generate personalized image suggestions
 * for both registered users and guest users
 */
const recommendationEngine = {
  /**
   * Generate recommendations for a user or guest
   * @param {Object} options - Options for generating recommendations
   * @param {string} [options.userId] - User ID for registered users
   * @param {string} [options.guestId] - Guest ID for non-registered users
   * @param {number} [options.limit=5] - Maximum number of recommendations to return
   * @returns {Promise<Array>} - Array of recommendation objects
   */
  async generateRecommendations({ userId, guestId, limit = 5 }) {
    // Validate that either userId or guestId is provided
    if (!userId && !guestId) {
      throw new Error("Either userId or guestId must be provided");
    }

    // Get the user's or guest's history
    const userHistory = await History.find(userId ? { userId } : { guestId })
      .sort({ timestamp: -1 })
      .limit(10);

    if (userHistory.length === 0) {
      // New user with no history, return popular images
      return this.getPopularRecommendations({ userId, guestId, limit });
    }

    // Extract classification patterns from user history
    const classificationPatterns =
      this.extractClassificationPatterns(userHistory);

    // Find similar images based on classification patterns
    const similarImages = await this.findSimilarImages({
      userId,
      guestId,
      classificationPatterns,
      limit,
      excludeIds: userHistory.map((h) => h._id),
    });

    // Create recommendation records
    const recommendations = similarImages.map((image) => ({
      userId,
      guestId,
      recommendedImageId: image._id,
      recommendedImageUrl: image.imageUrl,
      relevanceScore: image.similarityScore,
      reason: "similar-classification",
    }));

    // Save recommendations to database
    await Recommendation.insertMany(recommendations);

    return recommendations;
  },

  /**
   * Extract classification patterns from user history
   * @param {Array} history - User's image history
   * @returns {Object} - Classification patterns object
   */
  extractClassificationPatterns(history) {
    const patterns = {};

    // Analyze classifications from history
    history.forEach((item) => {
      if (item.classification) {
        // Handle different classification structures:
        // Classification could be array, object, or string depending on your app
        if (typeof item.classification === "object") {
          // If it's an object with categories/labels
          Object.entries(item.classification).forEach(([key, value]) => {
            patterns[key] = patterns[key] || { count: 0, values: {} };
            patterns[key].count += 1;

            if (typeof value === "string") {
              patterns[key].values[value] =
                (patterns[key].values[value] || 0) + 1;
            }
          });
        } else if (typeof item.classification === "string") {
          // If it's a simple string label
          patterns[item.classification] =
            (patterns[item.classification] || 0) + 1;
        }
      }
    });

    return patterns;
  },

  /**
   * Find images similar to user's preferences
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Similar images with similarity scores
   */
  async findSimilarImages({
    userId,
    guestId,
    classificationPatterns,
    limit,
    excludeIds = [],
  }) {
    // Convert classification patterns to a query
    const query = this.buildSimilarityQuery(classificationPatterns);

    // Exclude images the user has already seen
    if (excludeIds.length) {
      query._id = { $nin: excludeIds };
    }

    // Exclude the user's own images if userId is provided
    if (userId) {
      query.userId = { $ne: userId };
    }

    // Find potential matches
    const potentialMatches = await History.find(query).limit(100);

    // Score each potential match based on similarity to the user's patterns
    const scoredMatches = potentialMatches.map((match) => {
      const similarityScore = this.calculateSimilarityScore(
        match.classification,
        classificationPatterns
      );

      // Convert to plain object and ensure imageUrl is included
      const matchObj = match.toObject();

      return {
        ...matchObj,
        similarityScore,
        imageUrl: match.imageUrl, // Use the direct property from the document
      };
    });

    // Filter out any matches that don't have an imageUrl
    const validMatches = scoredMatches.filter((match) => match.imageUrl);

    // Sort by similarity score and take the top 'limit' matches
    return validMatches
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);
  },

  /**
   * Build a MongoDB query from classification patterns
   * @param {Object} patterns - Classification patterns
   * @returns {Object} - MongoDB query object
   */
  buildSimilarityQuery(patterns) {
    const query = {};

    // Build query conditions based on top patterns
    Object.entries(patterns).forEach(([key, value]) => {
      if (typeof value === "object" && value.values) {
        // Get the top 3 most frequent values for this category
        const topValues = Object.entries(value.values)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map((entry) => entry[0]);

        if (topValues.length) {
          query[`classification.${key}`] = { $in: topValues };
        }
      }
    });

    return query;
  },

  /**
   * Calculate similarity score between an image and user patterns
   * @param {Object} classification - Image classification
   * @param {Object} patterns - User classification patterns
   * @returns {number} - Similarity score (0-100)
   */
  calculateSimilarityScore(classification, patterns) {
    let matchScore = 0;
    let totalPossibleScore = 0;

    // Calculate score based on matching classification elements
    if (typeof classification === "object") {
      Object.entries(classification).forEach(([key, value]) => {
        if (patterns[key]) {
          totalPossibleScore += 10;

          if (typeof patterns[key] === "object" && patterns[key].values) {
            if (patterns[key].values[value]) {
              // Weight by how often this value appears in user history
              matchScore +=
                10 * (patterns[key].values[value] / patterns[key].count);
            }
          } else if (key === value) {
            matchScore += 10;
          }
        }
      });
    }

    // Prevent division by zero
    if (totalPossibleScore === 0) return 0;

    // Return normalized score (0-100)
    return Math.round((matchScore / totalPossibleScore) * 100);
  },

  /**
   * Get popular image recommendations when user has no history
   * @param {Object} options - Options for recommendations
   * @returns {Promise<Array>} - Array of popular recommendations
   */
  async getPopularRecommendations({ userId, guestId, limit = 5 }) {
    // Find the most viewed images in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Aggregate to find popular images
    const popularImages = await History.aggregate([
      { $match: { timestamp: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: "$imageUrl",
          count: { $sum: 1 },
          imageId: { $first: "$_id" },
          imageUrl: { $first: "$imageUrl" },
          classification: { $first: "$classification" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);

    // Filter out any images that don't have an imageUrl
    const validPopularImages = popularImages.filter((image) => image.imageUrl);

    // Create recommendation records
    const recommendations = validPopularImages.map((image) => ({
      userId,
      guestId,
      recommendedImageId: image.imageId,
      recommendedImageUrl: image.imageUrl,
      relevanceScore: 50 + Math.min(50, image.count), // Base score of 50, plus bonus for popularity
      reason: "popular",
    }));

    // Save recommendations to database
    if (recommendations.length > 0) {
      await Recommendation.insertMany(recommendations);
    }

    return recommendations;
  },

  /**
   * Mark a recommendation as viewed
   * @param {string} recommendationId - The recommendation ID
   * @returns {Promise<Object>} - Updated recommendation
   */
  async markAsViewed(recommendationId) {
    return Recommendation.findByIdAndUpdate(
      recommendationId,
      { wasViewed: true },
      { new: true }
    );
  },

  /**
   * Get existing recommendations for a user or guest
   * @param {Object} options - Options for fetching recommendations
   * @returns {Promise<Array>} - Array of recommendations
   */
  async getRecommendations({ userId, guestId, limit = 5, refreshAge = 24 }) {
    // Validate that either userId or guestId is provided
    if (!userId && !guestId) {
      throw new Error("Either userId or guestId must be provided");
    }

    // Calculate the age threshold for recommendations
    const refreshThreshold = new Date();
    refreshThreshold.setHours(refreshThreshold.getHours() - refreshAge);

    // Find existing recommendations that aren't too old
    const existingRecommendations = await Recommendation.find({
      ...(userId ? { userId } : { guestId }),
      createdAt: { $gte: refreshThreshold },
      wasViewed: false,
    })
      .sort({ relevanceScore: -1 })
      .limit(limit);

    // If we have enough recent recommendations, return them
    if (existingRecommendations.length >= limit) {
      return existingRecommendations;
    }

    // Otherwise, generate new recommendations
    const newRecommendations = await this.generateRecommendations({
      userId,
      guestId,
      limit: limit - existingRecommendations.length,
    });

    // Combine existing and new recommendations
    return [...existingRecommendations, ...newRecommendations];
  },
};

module.exports = recommendationEngine;
