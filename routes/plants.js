const express = require("express");
const path = require("path");
const fs = require("fs");
const Plant = require("../models/Plant");
const authenticateToken = require("../middleware/auth");
const multer = require("multer");

const router = express.Router();

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// GET all plants with pagination and filters
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 12, search, date, health } = req.query;
    const query = req.isGuest
      ? { guestId: req.guestId }
      : { userId: req.user.id };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { species: { $regex: search, $options: "i" } },
      ];
    }

    if (date && date !== "all") {
      const now = new Date();
      if (date === "today") {
        query.acquisitionDate = { $gte: new Date(now.setHours(0, 0, 0, 0)) };
      } else if (date === "week") {
        query.acquisitionDate = {
          $gte: new Date(now.setDate(now.getDate() - 7)),
        };
      } else if (date === "month") {
        query.acquisitionDate = {
          $gte: new Date(now.setMonth(now.getMonth() - 1)),
        };
      }
    }

    if (health && health !== "all") {
      query["healthHistory.status"] = health;
    }

    const plants = await Plant.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Plant.countDocuments(query);

    res.status(200).json({
      status: "success",
      plants,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        start: (page - 1) * limit + 1,
        end: Math.min(page * limit, total),
        total,
      },
    });
  } catch (error) {
    console.error("Error fetching plants:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch plants" });
  }
});

// POST a new plant
router.post(
  "/",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    try {
      const { name, species, location, acquisitionDate } = req.body;

      if (!name || !species || !location) {
        if (req.file && fs.existsSync(req.file.path))
          fs.unlinkSync(req.file.path);
        return res.status(400).json({
          status: "error",
          message: "Name, species, and location are required",
        });
      }

      let imageUrl = null;
      if (req.file) {
        imageUrl = path.join("/uploads", path.basename(req.file.path));
      }

      let parsedDate = null;
      if (acquisitionDate) {
        parsedDate = new Date(acquisitionDate);
        if (isNaN(parsedDate.getTime())) {
          if (req.file && fs.existsSync(req.file.path))
            fs.unlinkSync(req.file.path);
          return res.status(400).json({
            status: "error",
            message: "Invalid acquisition date format",
          });
        }
      }

      const plant = new Plant({
        userId: req.isGuest ? null : req.user.id,
        guestId: req.isGuest ? req.guestId : null,
        name,
        species,
        location,
        acquisitionDate: parsedDate,
        imageUrl,
        healthHistory: [
          { status: "healthy", notes: "Initial addition to collection" },
        ],
      });

      await plant.save();

      res.status(201).json({
        status: "success",
        message: "Plant added to collection",
        plant,
      });
    } catch (error) {
      console.error("Error adding plant:", error);
      if (req.file && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      res.status(500).json({
        status: "error",
        message: "Failed to add plant to collection",
      });
    }
  }
);

// PUT update a plant
router.put(
  "/:id",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, species, location, acquisitionDate } = req.body;

      if (!name || !species || !location) {
        if (req.file && fs.existsSync(req.file.path))
          fs.unlinkSync(req.file.path);
        return res.status(400).json({
          status: "error",
          message: "Name, species, and location are required",
        });
      }

      const plant = await Plant.findOne(
        req.isGuest
          ? { _id: id, guestId: req.guestId }
          : { _id: id, userId: req.user.id }
      );
      if (!plant) {
        if (req.file && fs.existsSync(req.file.path))
          fs.unlinkSync(req.file.path);
        return res
          .status(404)
          .json({ status: "error", message: "Plant not found" });
      }

      let imageUrl = plant.imageUrl;
      if (req.file) {
        if (imageUrl && fs.existsSync(path.join(__dirname, "..", imageUrl))) {
          fs.unlinkSync(path.join(__dirname, "..", imageUrl));
        }
        imageUrl = path.join("/uploads", path.basename(req.file.path));
      }

      let parsedDate = null;
      if (acquisitionDate) {
        parsedDate = new Date(acquisitionDate);
        if (isNaN(parsedDate.getTime())) {
          if (req.file && fs.existsSync(req.file.path))
            fs.unlinkSync(req.file.path);
          return res.status(400).json({
            status: "error",
            message: "Invalid acquisition date format",
          });
        }
      }

      plant.name = name;
      plant.species = species;
      plant.location = location;
      plant.acquisitionDate = parsedDate || plant.acquisitionDate;
      plant.imageUrl = imageUrl;

      await plant.save();

      res.status(200).json({
        status: "success",
        message: "Plant updated successfully",
        plant,
      });
    } catch (error) {
      console.error("Error updating plant:", error);
      if (req.file && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      res
        .status(500)
        .json({ status: "error", message: "Failed to update plant" });
    }
  }
);

// PATCH update plant status
router.patch("/:id/status", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (
      !status ||
      !["healthy", "concerning", "diseased", "recovering"].includes(status)
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "Invalid status. Must be one of: healthy, concerning, diseased, recovering",
      });
    }

    const plant = await Plant.findOne(
      req.isGuest
        ? { _id: id, guestId: req.guestId }
        : { _id: id, userId: req.user.id }
    );
    if (!plant) {
      return res
        .status(404)
        .json({ status: "error", message: "Plant not found" });
    }

    plant.healthHistory.push({
      status,
      notes: `Status updated to ${status}`,
      date: new Date(),
    });

    await plant.save();

    res.status(200).json({
      status: "success",
      message: "Plant status updated successfully",
      plant,
    });
  } catch (error) {
    console.error("Error updating plant status:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to update plant status" });
  }
});

// DELETE a plant
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const plant = await Plant.findOne(
      req.isGuest
        ? { _id: id, guestId: req.guestId }
        : { _id: id, userId: req.user.id }
    );
    if (!plant) {
      return res
        .status(404)
        .json({ status: "error", message: "Plant not found" });
    }

    if (
      plant.imageUrl &&
      fs.existsSync(path.join(__dirname, "..", plant.imageUrl))
    ) {
      fs.unlinkSync(path.join(__dirname, "..", plant.imageUrl));
    }

    await Plant.deleteOne({ _id: id });

    res
      .status(200)
      .json({ status: "success", message: "Plant removed successfully" });
  } catch (error) {
    console.error("Error deleting plant:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to remove plant" });
  }
});

module.exports = router;
