const express = require("express");
const History = require("../models/History");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// Helper function to handle common pagination logic
async function handlePagination(query, page, limit) {
  const skip = (page - 1) * limit;
  const [history, total] = await Promise.all([
    History.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ timestamp: -1 }),
    History.countDocuments(query),
  ]);
  return { history, total };
}

// Route to save classification history
router.post("/", authenticateToken, async (req, res) => {
  const { imageUrl, filename, classification, notes } = req.body;

  // Validation for required fields
  if (!imageUrl || !filename || !classification) {
    return res.status(400).json({
      status: "error",
      message: "imageUrl, filename, and classification are required",
    });
  }

  try {
    const history = new History({
      userId: req.user.id,
      imageUrl,
      filename,
      classification,
      notes,
    });

    await history.save();

    res.status(201).json({
      status: "success",
      message: "Classification saved to history",
      id: history._id,
    });
  } catch (error) {
    console.error("Error saving to history:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to save to history",
    });
  }
});

// Route to fetch user's history with pagination and search
router.get("/", authenticateToken, async (req, res) => {
  const { page = 1, limit = 10, search } = req.query;

  // Ensure valid pagination parameters
  if (page <= 0 || limit <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Page and limit must be greater than 0",
    });
  }

  try {
    let query = {};
    if (req.isGuest) {
      if (!req.guestId) {
        return res.json({
          status: "success",
          history: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            pages: 0,
          },
        });
      }
      query = { guestId: req.guestId };
    } else {
      query = { userId: req.user.id };
    }

    // Add search filter if provided
    if (search) {
      query.$or = [
        {
          "classification.prediction.plant": { $regex: search, $options: "i" },
        },
        {
          "classification.prediction.condition": {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    // Fetch history and calculate pagination in parallel
    const { history, total } = await handlePagination(query, page, limit);

    res.json({
      status: "success",
      history,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        start: (page - 1) * limit + 1,
        end: Math.min(page * limit, total),
      },
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve history",
    });
  }
});

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const query = req.isGuest
      ? { _id: req.params.id, guestId: req.guestId }
      : { _id: req.params.id, userId: req.user.id };
    const history = await History.findOne(query);
    if (!history)
      return res
        .status(404)
        .json({ status: "error", message: "History item not found" });
    res.json({ status: "success", history });
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch history item" });
  }
});

// Route to remove a history entry by ID
router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    let query = { _id: id };

    if (req.isGuest) {
      if (!req.guestId) {
        return res.status(403).json({
          status: "error",
          message: "Unauthorized action",
        });
      }
      query.guestId = req.guestId;
    } else {
      query.userId = req.user.id;
    }

    const deletedHistory = await History.findOneAndDelete(query);

    if (!deletedHistory) {
      return res.status(404).json({
        status: "error",
        message: "History entry not found or unauthorized",
      });
    }

    res.json({
      status: "success",
      message: "History entry deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting history entry:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to delete history entry",
    });
  }
});

module.exports = router;
