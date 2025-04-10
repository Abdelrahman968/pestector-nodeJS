const express = require("express");
const { MAX_GUEST_SCANS } = require("../config");
const GuestUser = require("../models/GuestUser");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// Endpoint to get usage stats for guest users
router.get("/stats", authenticateToken, async (req, res) => {
  // If the user is not a guest or guestId is not present, return default stats
  if (!req.isGuest || !req.guestId) {
    return res.json({
      status: "success",
      scans_used: 0,
      scans_remaining: MAX_GUEST_SCANS,
      scan_limit: MAX_GUEST_SCANS,
    });
  }

  try {
    // Attempt to find the guest user in the database
    const guestUser = await GuestUser.findOne({ guestId: req.guestId });

    // If no guest user is found, return default stats
    if (!guestUser) {
      return res.json({
        status: "success",
        scans_used: 0,
        scans_remaining: MAX_GUEST_SCANS,
        scan_limit: MAX_GUEST_SCANS,
      });
    }

    // Return the usage statistics for the guest user
    res.json({
      status: "success",
      scans_used: guestUser.scanCount,
      scans_remaining: Math.max(0, MAX_GUEST_SCANS - guestUser.scanCount),
      scan_limit: MAX_GUEST_SCANS,
      last_scan: guestUser.lastScan,
    });
  } catch (error) {
    // Handle any errors during the process
    console.error("Error fetching guest stats:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve guest usage statistics",
    });
  }
});

router.post("/register", async (req, res) => {
  try {
    const guestId = require("crypto").randomUUID();

    const newGuest = new GuestUser({
      guestId,
      scanCount: 0,
      lastScan: null,
    });

    await newGuest.save();

    // Set a cookie with the guest ID
    res.cookie("guestId", guestId, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(201).json({
      status: "success",
      guestId,
      message: "Guest user created successfully",
    });
  } catch (error) {
    console.error("Error creating guest user:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to create guest user",
    });
  }
});

router.put("/scan", authenticateToken, async (req, res) => {
  if (!req.isGuest || !req.guestId) {
    return res.status(400).json({
      status: "error",
      message: "Valid guest ID required",
    });
  }

  try {
    let guestUser = await GuestUser.findOne({ guestId: req.guestId });

    if (!guestUser) {
      guestUser = new GuestUser({
        guestId: req.guestId,
        scanCount: 0,
      });
    }

    guestUser.scanCount += 1;
    guestUser.lastScan = new Date();
    await guestUser.save();

    const scansRemaining = Math.max(0, MAX_GUEST_SCANS - guestUser.scanCount);

    res.json({
      status: "success",
      scans_used: guestUser.scanCount,
      scans_remaining: scansRemaining,
      scan_limit: MAX_GUEST_SCANS,
      last_scan: guestUser.lastScan,
    });
  } catch (error) {
    console.error("Error updating guest scan count:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to update scan count",
    });
  }
});

module.exports = router;
