const History = require("../models/History");
const Recommendation = require("../models/Recommendation");
const mongoose = require("mongoose");

class EnhancedRecommendationEngine {
  constructor() {
    this.CLASSIFICATION_WEIGHTS = {
      plant_type: 0.4, // 40% weight for plant type matching
      plant_condition: 0.25, // 25% weight for condition matching
      confidence_boost: 0.15, // 15% boost for high-confidence classifications
      recency_boost: 0.1, // 10% boost for recent items
      popularity_boost: 0.1, // 10% boost for popular items
    };

    this.SCORE_THRESHOLDS = {
      excellent: 80,
      good: 60,
      fair: 40,
      minimum: 20,
    };

    this.CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
    this.popularityCache = new Map();
    this.userPatternCache = new Map();
  }

  // Enhanced pattern extraction with confidence scoring
  extractClassificationPatterns(history) {
    const patterns = {
      plant_types: new Map(),
      plant_conditions: new Map(),
      recent_preferences: new Map(),
      confidence_levels: [],
      total_scans: history.length,
    };

    // Time decay factor for recent preferences (last 7 days get more weight)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    history.forEach((item, index) => {
      const isRecent = new Date(item.timestamp) > sevenDaysAgo;
      const recencyWeight = isRecent ? 1.5 : 1.0;
      const positionWeight = Math.max(0.5, 1 - (index / history.length) * 0.5); // Recent items get higher weight

      if (item.classification?.overall_best_prediction) {
        const prediction = item.classification.overall_best_prediction;
        const confidence = prediction.confidence || prediction.score || 0.5;

        patterns.confidence_levels.push(confidence);

        // Extract plant type with weighted scoring
        if (prediction.plant?.trim()) {
          const plantKey = prediction.plant.toLowerCase().trim();
          const currentWeight = patterns.plant_types.get(plantKey) || 0;
          patterns.plant_types.set(
            plantKey,
            currentWeight + recencyWeight * positionWeight * confidence
          );

          if (isRecent) {
            patterns.recent_preferences.set(
              plantKey,
              (patterns.recent_preferences.get(plantKey) || 0) + 1
            );
          }
        }

        // Extract condition with weighted scoring
        if (prediction.condition?.trim()) {
          const conditionKey = prediction.condition.toLowerCase().trim();
          const currentWeight =
            patterns.plant_conditions.get(conditionKey) || 0;
          patterns.plant_conditions.set(
            conditionKey,
            currentWeight + recencyWeight * positionWeight * confidence
          );
        }
      }
    });

    // Calculate average confidence and normalize patterns
    patterns.avg_confidence =
      patterns.confidence_levels.length > 0
        ? patterns.confidence_levels.reduce((a, b) => a + b) /
          patterns.confidence_levels.length
        : 0.5;

    return patterns;
  }

  // Build more sophisticated similarity query with multiple strategies
  buildAdvancedSimilarityQuery(
    patterns,
    contentType = null,
    strategy = "balanced"
  ) {
    const queries = [];

    // Strategy 1: Exact matches for high-confidence patterns
    if (patterns.plant_types.size > 0) {
      const topPlants = Array.from(patterns.plant_types.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([plant]) => plant);

      if (contentType) {
        // If contentType is specified, prioritize it but also include user preferences
        const contentTypeQuery = {
          "classification.overall_best_prediction.plant": new RegExp(
            `^${contentType}$`,
            "i"
          ),
        };

        const userPreferenceQuery = {
          "classification.overall_best_prediction.plant": {
            $in: topPlants.map((plant) => new RegExp(`^${plant}$`, "i")),
          },
        };

        queries.push(contentTypeQuery);
        if (strategy === "balanced") {
          queries.push(userPreferenceQuery);
        }
      } else {
        queries.push({
          "classification.overall_best_prediction.plant": {
            $in: topPlants.map((plant) => new RegExp(`^${plant}$`, "i")),
          },
        });
      }
    }

    // Strategy 2: Condition-based matching
    if (patterns.plant_conditions.size > 0 && strategy !== "plant_only") {
      const topConditions = Array.from(patterns.plant_conditions.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([condition]) => condition);

      queries.push({
        "classification.overall_best_prediction.condition": {
          $in: topConditions.map(
            (condition) => new RegExp(`^${condition}$`, "i")
          ),
        },
      });
    }

    // Strategy 3: Recent preferences boost
    if (patterns.recent_preferences.size > 0 && strategy === "recent_focused") {
      const recentPlants = Array.from(patterns.recent_preferences.keys());
      queries.push({
        "classification.overall_best_prediction.plant": {
          $in: recentPlants.map((plant) => new RegExp(`^${plant}$`, "i")),
        },
      });
    }

    return queries.length > 0 ? { $or: queries } : {};
  }

  // Enhanced similarity scoring with multiple factors
  calculateAdvancedSimilarityScore(
    imageClassification,
    userPatterns,
    imageMetadata = {}
  ) {
    let score = 0;
    let maxPossibleScore = 100;
    const factors = {};

    const prediction = imageClassification?.overall_best_prediction;
    if (!prediction) return Math.floor(Math.random() * 15) + 10;

    // Factor 1: Plant type similarity
    if (prediction.plant && userPatterns.plant_types.size > 0) {
      const plantKey = prediction.plant.toLowerCase().trim();
      const plantWeight = userPatterns.plant_types.get(plantKey) || 0;
      const maxPlantWeight = Math.max(...userPatterns.plant_types.values());

      if (maxPlantWeight > 0) {
        const plantScore =
          (plantWeight / maxPlantWeight) *
          this.CLASSIFICATION_WEIGHTS.plant_type *
          100;
        score += plantScore;
        factors.plant_match = plantScore;
      }
    }

    // Factor 2: Condition similarity
    if (prediction.condition && userPatterns.plant_conditions.size > 0) {
      const conditionKey = prediction.condition.toLowerCase().trim();
      const conditionWeight =
        userPatterns.plant_conditions.get(conditionKey) || 0;
      const maxConditionWeight = Math.max(
        ...userPatterns.plant_conditions.values()
      );

      if (maxConditionWeight > 0) {
        const conditionScore =
          (conditionWeight / maxConditionWeight) *
          this.CLASSIFICATION_WEIGHTS.plant_condition *
          100;
        score += conditionScore;
        factors.condition_match = conditionScore;
      }
    }

    // Factor 3: Confidence boost
    const imageConfidence = prediction.confidence || prediction.score || 0.5;
    const confidenceBoost =
      imageConfidence * this.CLASSIFICATION_WEIGHTS.confidence_boost * 100;
    score += confidenceBoost;
    factors.confidence_boost = confidenceBoost;

    // Factor 4: Recency boost (if image is recent)
    if (imageMetadata.timestamp) {
      const daysSinceCreation =
        (Date.now() - new Date(imageMetadata.timestamp)) /
        (1000 * 60 * 60 * 24);
      if (daysSinceCreation <= 30) {
        // Boost recent images
        const recencyBoost =
          Math.max(0, (30 - daysSinceCreation) / 30) *
          this.CLASSIFICATION_WEIGHTS.recency_boost *
          100;
        score += recencyBoost;
        factors.recency_boost = recencyBoost;
      }
    }

    // Factor 5: Popularity boost (cached)
    if (imageMetadata.popularityScore) {
      const popularityBoost =
        imageMetadata.popularityScore *
        this.CLASSIFICATION_WEIGHTS.popularity_boost *
        100;
      score += popularityBoost;
      factors.popularity_boost = popularityBoost;
    }

    const finalScore = Math.min(100, Math.max(10, Math.round(score)));

    // Add some randomization to prevent always showing the same recommendations
    const randomVariation = (Math.random() - 0.5) * 5; // ±2.5 points
    return Math.min(
      100,
      Math.max(10, Math.round(finalScore + randomVariation))
    );
  }

  // Cached popularity calculation
  async getPopularityScores(timeRangeHours = 24 * 7) {
    // Default: last week
    const cacheKey = `popularity_${timeRangeHours}`;
    const cached = this.popularityCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    const timeThreshold = new Date(
      Date.now() - timeRangeHours * 60 * 60 * 1000
    );

    const popularityData = await History.aggregate([
      {
        $match: {
          timestamp: { $gte: timeThreshold },
          imageUrl: { $ne: null, $ne: "" },
        },
      },
      {
        $group: {
          _id: "$imageUrl",
          count: { $sum: 1 },
          avgConfidence: {
            $avg: {
              $ifNull: [
                "$classification.overall_best_prediction.confidence",
                0.5,
              ],
            },
          },
          latestTimestamp: { $max: "$timestamp" },
          originalDocId: { $first: "$_id" },
        },
      },
      {
        $addFields: {
          popularityScore: {
            $multiply: [
              { $log: [{ $add: ["$count", 1] }, 10] },
              "$avgConfidence",
            ],
          },
        },
      },
      { $sort: { popularityScore: -1 } },
    ]);

    const scoreMap = new Map();
    const maxScore =
      popularityData.length > 0 ? popularityData[0].popularityScore : 1;

    popularityData.forEach((item) => {
      scoreMap.set(item._id, {
        score: item.popularityScore / maxScore, // Normalize 0-1
        count: item.count,
        avgConfidence: item.avgConfidence,
        originalDocId: item.originalDocId,
      });
    });

    this.popularityCache.set(cacheKey, {
      data: scoreMap,
      timestamp: Date.now(),
    });

    return scoreMap;
  }

  // Enhanced similarity search with multiple strategies and batching
  async findSimilarImages({
    userId,
    guestId,
    classificationPatterns,
    limit,
    excludeIds = [],
    contentType = null,
    strategy = "balanced",
  }) {
    const popularityScores = await this.getPopularityScores();

    // Build query with the specified strategy
    const baseQuery = this.buildAdvancedSimilarityQuery(
      classificationPatterns,
      contentType,
      strategy
    );

    // Add exclusions
    if (excludeIds.length > 0) {
      baseQuery._id = { $nin: excludeIds.filter((id) => id) };
    }

    // Exclude user's own images
    if (userId) {
      baseQuery.userId = { $ne: userId };
    }

    // console.log(
    //   `Finding similar images with strategy: ${strategy}, query:`,
    //   JSON.stringify(baseQuery, null, 2)
    // );

    // Fetch more candidates for better scoring
    const fetchLimit = Math.min(500, limit * 20);
    const potentialMatches = await History.find(baseQuery)
      .sort({ timestamp: -1 })
      .limit(fetchLimit)
      .lean();

    // Score and rank all matches
    const scoredMatches = potentialMatches
      .map((match) => {
        const popularityData = popularityScores.get(match.imageUrl);
        const metadata = {
          timestamp: match.timestamp,
          popularityScore: popularityData?.score || 0,
        };

        return {
          ...match,
          similarityScore: this.calculateAdvancedSimilarityScore(
            match.classification,
            classificationPatterns,
            metadata
          ),
          popularityData,
        };
      })
      .filter(
        (match) =>
          match.imageUrl &&
          match._id &&
          match.similarityScore >= this.SCORE_THRESHOLDS.minimum
      )
      .sort((a, b) => b.similarityScore - a.similarityScore);

    // Diversification: ensure we don't recommend too many of the same plant type
    const diversifiedMatches = this.diversifyRecommendations(
      scoredMatches,
      limit
    );

    return diversifiedMatches.slice(0, limit);
  }

  // Add diversity to prevent recommending too many similar items
  diversifyRecommendations(scoredMatches, limit) {
    const plantTypeCount = new Map();
    const diversified = [];
    const maxPerType = Math.max(1, Math.floor(limit / 3)); // Max 1/3 of recommendations per plant type

    // First pass: high-scoring diverse recommendations
    for (const match of scoredMatches) {
      if (diversified.length >= limit) break;

      const plantType =
        match.classification?.overall_best_prediction?.plant?.toLowerCase() ||
        "unknown";
      const currentCount = plantTypeCount.get(plantType) || 0;

      if (
        currentCount < maxPerType ||
        match.similarityScore >= this.SCORE_THRESHOLDS.excellent
      ) {
        diversified.push(match);
        plantTypeCount.set(plantType, currentCount + 1);
      }
    }

    // Second pass: fill remaining slots if needed
    if (diversified.length < limit) {
      const remaining = scoredMatches.filter(
        (match) => !diversified.includes(match)
      );
      diversified.push(...remaining.slice(0, limit - diversified.length));
    }

    return diversified;
  }

  // Enhanced recommendation generation with multiple strategies
  async generateRecommendations({
    userId,
    guestId,
    limit = 5,
    contentType = null,
    strategy = "balanced", // 'balanced', 'recent_focused', 'plant_only'
  }) {
    if (!userId && !guestId) {
      throw new Error("User/Guest ID missing for generateRecommendations.");
    }

    // Get user history with more context
    const userHistory = await History.find(userId ? { userId } : { guestId })
      .sort({ timestamp: -1 })
      .limit(50) // Increased for better pattern analysis
      .lean();

    // Get existing recommendations to avoid duplicates
    const existingRecs = await Recommendation.find({
      ...(userId ? { userId } : { guestId }),
    })
      .select("recommendedImageId")
      .lean();

    const excludeImageIds = [
      ...existingRecs.map((r) => r.recommendedImageId).filter((id) => id),
      ...userHistory.map((h) => h._id).filter((id) => id),
    ];

    let recommendations = [];

    if (userHistory.length > 0) {
      // Extract patterns with enhanced analysis
      const patterns = this.extractClassificationPatterns(userHistory);

      // Try multiple strategies and combine results
      const strategies =
        strategy === "balanced"
          ? ["balanced", "recent_focused", "plant_only"]
          : [strategy];

      for (const currentStrategy of strategies) {
        const strategyLimit = Math.ceil(limit / strategies.length);
        const similarImages = await this.findSimilarImages({
          userId,
          guestId,
          classificationPatterns: patterns,
          limit: strategyLimit,
          excludeIds: excludeImageIds,
          contentType,
          strategy: currentStrategy,
        });

        recommendations.push(
          ...similarImages.map((img) => ({
            userId,
            guestId,
            recommendedImageId: img._id,
            recommendedImageUrl: img.imageUrl,
            relevanceScore: img.similarityScore,
            reason: contentType
              ? "similar-content-type"
              : "similar-classification",
            sourceContentType: contentType || undefined,
            metadata: {
              strategy: currentStrategy,
              popularityData: img.popularityData,
            },
          }))
        );

        // Update exclude list to prevent duplicates across strategies
        recommendations.forEach((rec) => {
          if (
            !excludeImageIds.some(
              (id) => id.equals && id.equals(rec.recommendedImageId)
            )
          ) {
            excludeImageIds.push(rec.recommendedImageId);
          }
        });
      }
    }

    // Fill remaining slots with popular items if needed
    if (recommendations.length < limit) {
      const popularRecommendations = await this.getPopularRecommendationsData({
        userId,
        guestId,
        limit: limit - recommendations.length,
        contentType,
        excludeIds: excludeImageIds,
      });
      recommendations.push(...popularRecommendations);
    }

    // Remove duplicates and sort by relevance
    const uniqueRecommendations = Array.from(
      new Map(
        recommendations.map((rec) => [rec.recommendedImageId.toString(), rec])
      ).values()
    )
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    // Save recommendations to database
    return this.saveRecommendations(uniqueRecommendations);
  }

  // Enhanced popular recommendations with better scoring
  async getPopularRecommendationsData({
    userId,
    guestId,
    limit = 5,
    contentType = null,
    excludeIds = [],
  }) {
    const popularityScores = await this.getPopularityScores();

    // Convert popularity scores to recommendation format
    const popularRecommendations = Array.from(popularityScores.entries())
      .filter(([imageUrl, data]) => {
        // Exclude user's images and already recommended images
        return !excludeIds.some(
          (id) => id.equals && id.equals(data.originalDocId)
        );
      })
      .slice(0, limit * 2) // Get more candidates for filtering
      .map(([imageUrl, data]) => ({
        userId,
        guestId,
        recommendedImageId: data.originalDocId,
        recommendedImageUrl: imageUrl,
        relevanceScore: Math.round(40 + data.score * 40), // Scale to 40-80 range
        reason: contentType ? "popular-content-type" : "popular-general",
        sourceContentType: contentType || undefined,
      }));

    // If contentType is specified, filter by it
    if (contentType) {
      // We'd need to fetch the actual documents to check classification
      // This is a simplified version - in production, you might want to cache this data
      const filteredRecommendations = [];
      for (const rec of popularRecommendations) {
        if (filteredRecommendations.length >= limit) break;

        const historyItem = await History.findById(
          rec.recommendedImageId
        ).lean();
        if (historyItem?.classification?.overall_best_prediction?.plant) {
          const plantType =
            historyItem.classification.overall_best_prediction.plant.toLowerCase();
          if (plantType.includes(contentType.toLowerCase())) {
            filteredRecommendations.push(rec);
          }
        }
      }
      return filteredRecommendations;
    }

    return popularRecommendations.slice(0, limit);
  }

  // Optimized recommendation saving with batch operations
  async saveRecommendations(recommendationData) {
    if (!recommendationData.length) return [];

    const savedRecommendations = [];

    // Use bulk operations for better performance
    const bulkOps = [];

    for (const recData of recommendationData) {
      const filter = {
        ...(recData.userId
          ? { userId: recData.userId }
          : { guestId: recData.guestId }),
        recommendedImageId: recData.recommendedImageId,
      };

      const update = {
        $set: {
          ...recData,
          relevanceScore: Math.max(
            15,
            Math.min(99, Math.round(recData.relevanceScore))
          ),
          wasViewed: false,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      };

      bulkOps.push({
        updateOne: {
          filter,
          update,
          upsert: true,
        },
      });
    }

    try {
      if (bulkOps.length > 0) {
        await Recommendation.bulkWrite(bulkOps);

        // Fetch the saved recommendations
        const filters = recommendationData.map((rec) => ({
          ...(rec.userId ? { userId: rec.userId } : { guestId: rec.guestId }),
          recommendedImageId: rec.recommendedImageId,
        }));

        const saved = await Recommendation.find({ $or: filters })
          .sort({ relevanceScore: -1, createdAt: -1 })
          .limit(recommendationData.length);

        savedRecommendations.push(...saved);
      }
    } catch (error) {
      console.error("Error in bulk save recommendations:", error);
      // Fallback to individual saves
      for (const recData of recommendationData) {
        try {
          const saved = await Recommendation.findOneAndUpdate(
            {
              ...(recData.userId
                ? { userId: recData.userId }
                : { guestId: recData.guestId }),
              recommendedImageId: recData.recommendedImageId,
            },
            {
              ...recData,
              relevanceScore: Math.max(
                15,
                Math.min(99, Math.round(recData.relevanceScore))
              ),
              wasViewed: false,
              updatedAt: new Date(),
            },
            { upsert: true, new: true }
          );
          savedRecommendations.push(saved);
        } catch (individualError) {
          console.error(
            "Error saving individual recommendation:",
            individualError
          );
        }
      }
    }

    return savedRecommendations;
  }

  // Enhanced getRecommendations with better caching and fallback strategies
  async getRecommendations({
    userId,
    guestId,
    limit = 5,
    refreshAge = 24,
    contentType = null,
    fetchViewed = false,
    strategy = "balanced",
  }) {
    if (!userId && !guestId) {
      throw new Error("User/Guest ID missing for getRecommendations.");
    }

    const ageThreshold = new Date();
    ageThreshold.setHours(
      ageThreshold.getHours() - (fetchViewed ? 720 : refreshAge)
    );

    let query = {
      ...(userId ? { userId } : { guestId }),
      wasViewed: fetchViewed,
    };

    if (!fetchViewed || (fetchViewed && refreshAge < 720)) {
      query.createdAt = { $gte: ageThreshold };
    }
    if (contentType) {
      query.sourceContentType = contentType;
    }

    // Get existing recommendations
    let recommendations = await Recommendation.find(query)
      .populate("recommendedImageId", "classification imageUrl timestamp")
      .sort(
        fetchViewed ? { updatedAt: -1 } : { relevanceScore: -1, createdAt: -1 }
      )
      .limit(limit)
      .exec();

    // If we don't have enough unviewed recommendations, generate new ones
    if (!fetchViewed && recommendations.length < limit) {
      const needed = limit - recommendations.length;

      try {
        const newRecommendations = await this.generateRecommendations({
          userId,
          guestId,
          limit: needed,
          contentType,
          strategy,
        });

        // Merge with existing and deduplicate
        const existingIds = new Set(
          recommendations
            .map((r) => r.recommendedImageId?._id?.toString())
            .filter(Boolean)
        );

        const newUniqueRecs = newRecommendations.filter(
          (newRec) => !existingIds.has(newRec.recommendedImageId?.toString())
        );

        recommendations.push(...newUniqueRecs);

        // Re-sort the combined results
        recommendations.sort(
          (a, b) =>
            b.relevanceScore - a.relevanceScore ||
            new Date(b.createdAt) - new Date(a.createdAt)
        );
      } catch (error) {
        console.error("Error generating new recommendations:", error);
        // Continue with existing recommendations even if generation fails
      }
    }

    return recommendations.slice(0, limit);
  }

  // Enhanced markAsViewed with analytics tracking
  async markAsViewed(recommendationId, userId = null, guestId = null) {
    if (
      !recommendationId ||
      typeof recommendationId !== "string" ||
      recommendationId.length !== 24
    ) {
      throw new Error("Invalid recommendationId format for markAsViewed.");
    }

    const updateData = {
      wasViewed: true,
      updatedAt: new Date(),
      viewedAt: new Date(),
    };

    // Add user context if provided (for analytics)
    if (userId) updateData.viewedByUserId = userId;
    if (guestId) updateData.viewedByGuestId = guestId;

    const updated = await Recommendation.findByIdAndUpdate(
      recommendationId,
      updateData,
      { new: true }
    );

    // Optional: Track view analytics here
    if (updated) {
      this.trackRecommendationView(updated);
    }

    return updated;
  }

  // Analytics tracking for recommendation views
  trackRecommendationView(recommendation) {
    // This is where you could integrate with analytics services
    // or update internal metrics about recommendation performance
    // console.log(
    //   `Recommendation viewed - ID: ${recommendation._id}, Score: ${recommendation.relevanceScore}, Reason: ${recommendation.reason}`
    // );
  }

  // Clear caches (useful for testing or manual cache invalidation)
  clearCaches() {
    this.popularityCache.clear();
    this.userPatternCache.clear();
  }

  // Get recommendation statistics (useful for debugging and monitoring)
  async getRecommendationStats(userId, guestId) {
    const filter = userId
      ? { userId: new mongoose.Types.ObjectId(userId) }
      : { guestId }; // Ensure userId is ObjectId
    // console.log(`[Stats Engine] Getting stats with filter:`, filter); // Log the filter being used

    try {
      // Added try-catch block for aggregation
      const stats = await Recommendation.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalRecommendations: { $sum: 1 },
            viewedRecommendations: { $sum: { $cond: ["$wasViewed", 1, 0] } },
            avgRelevanceScore: { $avg: "$relevanceScore" },
            reasonBreakdown: {
              $push: "$reason",
            },
          },
        },
      ]);

      // console.log(`[Stats Engine] Aggregation result:`, JSON.stringify(stats)); // Log the raw aggregation result

      if (stats.length === 0) {
        // console.log(`[Stats Engine] No recommendations found for filter.`);
        return {
          totalRecommendations: 0,
          viewedRecommendations: 0,
          viewRate: 0,
          avgRelevanceScore: 0,
          reasonBreakdown: {},
        };
      }

      const stat = stats[0];
      const reasonCounts = stat.reasonBreakdown.reduce((acc, reason) => {
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {});

      const result = {
        totalRecommendations: stat.totalRecommendations,
        viewedRecommendations: stat.viewedRecommendations,
        unviewedRecommendations:
          stat.totalRecommendations - stat.viewedRecommendations, // Calculate unviewed
        viewRate:
          stat.totalRecommendations > 0
            ? (stat.viewedRecommendations / stat.totalRecommendations) * 100
            : 0,
        avgRelevanceScore: Math.round(stat.avgRelevanceScore || 0),
        reasonBreakdown: reasonCounts,
      };
      // console.log(`[Stats Engine] Calculated stats:`, result);
      return result;
    } catch (error) {
      console.error(`[Stats Engine] Error during aggregation:`, error);
      return {
        // Return zero stats on error
        totalRecommendations: 0,
        viewedRecommendations: 0,
        viewRate: 0,
        avgRelevanceScore: 0,
        reasonBreakdown: {},
      };
    }
  }
}

// Export singleton instance
module.exports = new EnhancedRecommendationEngine();
