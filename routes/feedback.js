const express = require("express");
const ModelFeedback = require("../models/ModelFeedback");
const History = require("../models/History");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

router.post("/", authenticateToken, async (req, res) => {
  const { historyId, feedbackType, correctLabel, comments } = req.body;
  if (!historyId || !feedbackType || !correctLabel) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing required fields" });
  }

  try {
    const existingFeedback = await ModelFeedback.findOne({
      historyId,
      userId: req.user.id,
    });
    if (existingFeedback)
      return res.status(400).json({
        status: "error",
        message: "Feedback already exists for this history item",
      });

    const feedback = new ModelFeedback({
      userId: req.user.id,
      historyId,
      feedbackType,
      correctLabel,
      comments,
    });
    await feedback.save();
    res.status(201).json({ status: "success", feedback });
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: "Failed to submit feedback" });
  }
});

router.get("/", authenticateToken, async (req, res) => {
  try {
    const feedback = await ModelFeedback.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    res.json({ status: "success", feedback });
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch feedback" });
  }
});

router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { historyId, feedbackType, correctLabel, comments } = req.body;
    const feedback = await ModelFeedback.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { feedbackType, correctLabel, comments },
      { new: true }
    );
    if (!feedback)
      return res
        .status(404)
        .json({ status: "error", message: "Feedback not found" });
    res.json({ status: "success", feedback });
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: "Failed to update feedback" });
  }
});

module.exports = router;
