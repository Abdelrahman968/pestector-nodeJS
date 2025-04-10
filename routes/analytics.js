const express = require("express");
const mongoose = require("mongoose");
const History = require("../models/History");
const User = require("../models/User");
const TreatmentPlan = require("../models/TreatmentPlan");
const GuestUser = require("../models/GuestUser");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// Helper function to get user analytics
const getUserAnalytics = async (userId) => {
  try {
    // Get the count of scans by month
    const scansByMonth = await History.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
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

    // Get the most common diseases - FIXED: Better handling of classification structure
    const commonDiseases = await History.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      // Improved project stage to handle various possible structures
      {
        $project: {
          disease: {
            $cond: [
              // First check the new structure with prediction.condition
              { $ifNull: ["$classification.prediction.condition", false] },
              "$classification.prediction.condition",
              {
                $cond: [
                  // Then check the old structure with result.disease
                  { $ifNull: ["$classification.result.disease", false] },
                  {
                    $cond: [
                      { $isArray: "$classification.result.disease" },
                      "$classification.result.disease",
                      ["$classification.result.disease"],
                    ],
                  },
                  {
                    $cond: [
                      // Finally check the direct disease property
                      { $ifNull: ["$classification.disease", false] },
                      {
                        $cond: [
                          { $isArray: "$classification.disease" },
                          "$classification.disease",
                          ["$classification.disease"],
                        ],
                      },
                      [],
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      // Handle both array and string types for disease
      {
        $project: {
          disease: {
            $cond: [
              { $isArray: "$disease" },
              { $ifNull: [{ $arrayElemAt: ["$disease", 0] }, "Unknown"] },
              { $ifNull: ["$disease", "Unknown"] },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$disease",
          count: { $sum: 1 },
        },
      },
      { $match: { _id: { $ne: null, $ne: "", $ne: "Unknown" } } }, // Filter out null and empty values
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    return { scansByMonth, commonDiseases };
  } catch (error) {
    throw new Error("Failed to generate analytics: " + error.message);
  }
};

// Endpoint for user-specific analytics
router.get("/user", authenticateToken, async (req, res) => {
  if (req.isGuest) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required for analytics",
    });
  }

  try {
    const { scansByMonth, commonDiseases } = await getUserAnalytics(
      req.user.id
    );

    res.json({
      status: "success",
      analytics: {
        scansByMonth,
        commonDiseases,
      },
    });
  } catch (error) {
    console.error("Error generating analytics:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// Endpoint for general admin analytics (API Key required)
router.get("/", async (req, res) => {
  const apiKey = req.headers["x-api-key-analytics"];

  // API Key Authentication
  if (!apiKey || apiKey !== process.env.API_ANA_KEY) {
    return res.status(403).json({
      status: "error",
      message: "Forbidden: Invalid API Key",
    });
  }

  try {
    // Get user growth
    const userGrowth = await User.aggregate([
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

    // Get scan volume
    const scanVolume = await History.aggregate([
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

    // Get most common plant diseases - FIXED: Same improvement as in user analytics
    const commonDiseases = await History.aggregate([
      // Improved project stage to handle various possible structures
      {
        $project: {
          disease: {
            $cond: [
              // First check the new structure with prediction.condition
              { $ifNull: ["$classification.prediction.condition", false] },
              "$classification.prediction.condition",
              {
                $cond: [
                  // Then check the old structure with result.disease
                  { $ifNull: ["$classification.result.disease", false] },
                  {
                    $cond: [
                      { $isArray: "$classification.result.disease" },
                      "$classification.result.disease",
                      ["$classification.result.disease"],
                    ],
                  },
                  {
                    $cond: [
                      // Finally check the direct disease property
                      { $ifNull: ["$classification.disease", false] },
                      {
                        $cond: [
                          { $isArray: "$classification.disease" },
                          "$classification.disease",
                          ["$classification.disease"],
                        ],
                      },
                      [],
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      // Handle both array and string types for disease
      {
        $project: {
          disease: {
            $cond: [
              { $isArray: "$disease" },
              { $ifNull: [{ $arrayElemAt: ["$disease", 0] }, "Unknown"] },
              { $ifNull: ["$disease", "Unknown"] },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$disease",
          count: { $sum: 1 },
        },
      },
      { $match: { _id: { $ne: null, $ne: "", $ne: "Unknown" } } }, // Filter out null and empty values
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      status: "success",
      analytics: {
        userGrowth,
        scanVolume,
        commonDiseases,
        userCount: await User.countDocuments(),
        guestCount: await GuestUser.countDocuments(),
        totalScans: await History.countDocuments(),
      },
    });
  } catch (error) {
    console.error("Error generating admin analytics:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to generate admin analytics",
    });
  }
});

module.exports = router;
