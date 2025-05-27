const express = require("express");
const TreatmentPlan = require("../models/TreatmentPlan");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// Existing endpoints (assumed based on frontend usage)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const status = req.query.status || "";

    const query = req.isGuest
      ? { guestId: req.guestId }
      : { userId: req.user.id };
    if (search) {
      query.$or = [
        { plantName: { $regex: search, $options: "i" } },
        { disease: { $regex: search, $options: "i" } },
      ];
    }
    if (status && status !== "all") query.status = status;

    const treatmentPlans = await TreatmentPlan.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await TreatmentPlan.countDocuments(query);
    const pages = Math.ceil(total / limit);

    res.json({
      status: "success",
      treatmentPlans,
      pagination: {
        page,
        pages,
        start: skip + 1,
        end: Math.min(skip + limit, total),
        total,
      },
    });
  } catch (error) {
    console.error("Error fetching treatment plans:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch treatment plans" });
  }
});

// Add new stats endpoint
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const query = req.isGuest
      ? { guestId: req.guestId }
      : { userId: req.user.id };

    const diseaseStats = await TreatmentPlan.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$disease",
          count: { $sum: 1 },
        },
      },
      { $match: { _id: { $ne: null, $ne: "" } } }, // Filter out null/empty diseases
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    res.status(200).json({
      status: "success",
      diseaseStats,
    });
  } catch (error) {
    console.error("Error fetching disease stats:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch disease statistics",
    });
  }
});

// POST, PUT, DELETE endpoints (assumed based on frontend)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { plantName, disease, treatment } = req.body;
    const treatmentPlan = new TreatmentPlan({
      plantName,
      disease,
      treatment,
      status: "pending",
      userId: req.isGuest ? null : req.user.id,
      guestId: req.isGuest ? req.guestId : null,
    });
    await treatmentPlan.save();
    res.status(201).json({ status: "success", treatmentPlan });
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: "Failed to create treatment plan" });
  }
});

router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const treatmentPlan = await TreatmentPlan.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { status, updatedAt: new Date() },
      { new: true }
    );
    if (!treatmentPlan) throw new Error("Treatment plan not found");
    res.json({ status: "success", treatmentPlan });
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: "Failed to update treatment plan" });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const treatmentPlan = await TreatmentPlan.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!treatmentPlan) throw new Error("Treatment plan not found");
    res.json({ status: "success", message: "Treatment plan deleted" });
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: "Failed to delete treatment plan" });
  }
});

module.exports = router;
