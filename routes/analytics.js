const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const GuestUser = require("../models/GuestUser");
const Analytics = require("../models/Analytics"); // Switched from History for most analytics
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// Helper function to parse date query parameters
const parseDateQuery = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

// Helper function to get user analytics from the Analytics model
const getUserAnalyticsData = async (userId) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Get the count of scans by month
    const scansByMonth = await Analytics.aggregate([
      { $match: { userId: userObjectId } },
      {
        $group: {
          _id: {
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Get the most common conditions (diseases)
    const commonConditions = await Analytics.aggregate([
      { $match: { userId: userObjectId } },
      {
        $group: {
          _id: "$classification.condition",
          count: { $sum: 1 },
        },
      },
      {
        $match: { _id: { $ne: null, $ne: "", $ne: "Unknown", $ne: "healthy" } },
      }, // Filter out non-disease or uninformative
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Get the most common plants scanned
    const commonPlants = await Analytics.aggregate([
      { $match: { userId: userObjectId } },
      {
        $group: {
          _id: "$classification.plant",
          count: { $sum: 1 },
        },
      },
      { $match: { _id: { $ne: null, $ne: "", $ne: "Unknown" } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    return { scansByMonth, commonConditions, commonPlants };
  } catch (error) {
    console.error(`Error in getUserAnalyticsData for userId ${userId}:`, error);
    throw new Error(`Failed to generate user analytics: ${error.message}`);
  }
};

// Endpoint for user-specific analytics
router.get("/user", authenticateToken, async (req, res) => {
  if (req.isGuest) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required for user analytics.",
    });
  }

  try {
    const analyticsData = await getUserAnalyticsData(req.user.id);
    res.json({
      status: "success",
      analytics: analyticsData,
    });
  } catch (error) {
    // Error already logged in helper
    res.status(500).json({
      status: "error",
      message: error.message, // Message from the thrown error
    });
  }
});

// Endpoint for general admin analytics (API Key required)
router.get("/", async (req, res) => {
  const apiKey = req.headers["x-api-key-analytics"];

  if (!apiKey || apiKey !== process.env.API_ANA_KEY) {
    return res.status(403).json({
      status: "error",
      message: "Forbidden: Invalid or missing API Key for admin analytics.",
    });
  }

  try {
    const { dateStart: queryDateStart, dateEnd: queryDateEnd } = req.query;
    let dateFilter = {};
    const startDate = parseDateQuery(queryDateStart);
    const endDate = parseDateQuery(queryDateEnd);

    if (startDate) {
      dateFilter.timestamp = { ...dateFilter.timestamp, $gte: startDate };
    }
    if (endDate) {
      // Adjust endDate to include the whole day
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      dateFilter.timestamp = { ...dateFilter.timestamp, $lte: endOfDay };
    }

    // User growth (remains based on User model's createdAt)
    const userGrowthFilter = {};
    if (startDate)
      userGrowthFilter.createdAt = {
        ...userGrowthFilter.createdAt,
        $gte: startDate,
      };
    if (endDate)
      userGrowthFilter.createdAt = {
        ...userGrowthFilter.createdAt,
        $lte: endDate,
      };

    const userGrowth = await User.aggregate([
      ...(Object.keys(userGrowthFilter).length
        ? [{ $match: userGrowthFilter }]
        : []),
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Scan volume from Analytics model
    const scanVolume = await Analytics.aggregate([
      ...(Object.keys(dateFilter).length ? [{ $match: dateFilter }] : []),
      {
        $group: {
          _id: {
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Scans by user type over time
    const scansByUserTypeOverTime = await Analytics.aggregate([
      ...(Object.keys(dateFilter).length ? [{ $match: dateFilter }] : []),
      {
        $group: {
          _id: {
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" },
            userType: {
              $cond: {
                if: { $ifNull: ["$userId", false] },
                then: "registered",
                else: "guest",
              },
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: { year: "$_id.year", month: "$_id.month" },
          scans: {
            $push: { type: "$_id.userType", count: "$count" },
          },
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          counts: {
            $arrayToObject: {
              $map: {
                input: "$scans",
                as: "scan",
                in: { k: "$$scan.type", v: "$$scan.count" },
              },
            },
          },
        },
      },
      { $sort: { year: 1, month: 1 } },
    ]);

    // Most common conditions (diseases) from Analytics model
    const commonConditions = await Analytics.aggregate([
      ...(Object.keys(dateFilter).length ? [{ $match: dateFilter }] : []),
      { $group: { _id: "$classification.condition", count: { $sum: 1 } } },
      {
        $match: { _id: { $ne: null, $ne: "", $ne: "Unknown", $ne: "healthy" } },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Most common plants from Analytics model
    const commonPlants = await Analytics.aggregate([
      ...(Object.keys(dateFilter).length ? [{ $match: dateFilter }] : []),
      { $group: { _id: "$classification.plant", count: { $sum: 1 } } },
      { $match: { _id: { $ne: null, $ne: "", $ne: "Unknown" } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Model usage from Analytics model
    const modelUsage = await Analytics.aggregate([
      ...(Object.keys(dateFilter).length ? [{ $match: dateFilter }] : []),
      { $group: { _id: "$classification.model_source", count: { $sum: 1 } } },
      { $match: { _id: { $ne: null, $ne: "", $ne: "Unknown" } } },
      { $sort: { count: -1 } },
    ]);

    // Average processing time and confidence
    const performanceMetrics = await Analytics.aggregate([
      ...(Object.keys(dateFilter).length ? [{ $match: dateFilter }] : []),
      {
        $group: {
          _id: null,
          averageProcessingTime: { $avg: "$processing_time_seconds" },
          averageConfidence: { $avg: "$classification.confidence" },
        },
      },
    ]);

    const totalUsers = await User.countDocuments(
      userGrowthFilter.createdAt
        ? { createdAt: userGrowthFilter.createdAt }
        : {}
    );
    const totalGuests = await GuestUser.countDocuments(
      userGrowthFilter.createdAt
        ? { createdAt: userGrowthFilter.createdAt }
        : {}
    ); // Guest creation time might not be tracked in User model, this is a general count or needs GuestUser.createdAt if available
    const totalScans = await Analytics.countDocuments(dateFilter);

    res.json({
      status: "success",
      queryDateRange: dateFilter.timestamp
        ? { start: queryDateStart, end: queryDateEnd }
        : "All time",
      analytics: {
        userGrowth,
        scanVolume,
        scansByUserTypeOverTime,
        commonConditions,
        commonPlants,
        modelUsage,
        averageProcessingTime:
          performanceMetrics[0]?.averageProcessingTime?.toFixed(3) || 0,
        averageConfidence:
          performanceMetrics[0]?.averageConfidence?.toFixed(3) || 0,
        summary: {
          userCount: totalUsers,
          guestCount: totalGuests, // Note: GuestUser model might need a createdAt field for time-scoped counts
          totalScans: totalScans,
        },
      },
    });
  } catch (error) {
    console.error("Error generating admin analytics:", error);
    res.status(500).json({
      status: "error",
      message: `Failed to generate admin analytics: ${error.message}`,
    });
  }
});

module.exports = router;
