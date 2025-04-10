const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const History = require("../models/History");
const Chat = require("../models/Chat");
const User = require("../models/User");
const GuestUser = require("../models/GuestUser");

router.get("/", authenticateToken, async (req, res) => {
  if (req.isGuest)
    return res.status(401).json({ message: "Authentication required" });

  try {
    if (req.user.role !== "admin") {
      const historyCount = await History.countDocuments({
        userId: req.user.id,
      });
      const chatCount = await Chat.countDocuments({ userId: req.user.id });

      const lastLogin = req.user.lastLogin
        ? new Date(req.user.lastLogin).toISOString()
        : "N/A";

      return res.json({
        status: "success",
        user_stats: {
          history_count: historyCount || 0,
          chat_count: chatCount || 0,
          last_login: lastLogin,
        },
      });
    }

    // Admin branch
    const userCount = await User.countDocuments();
    const guestCount = await GuestUser.countDocuments();
    const historyCount = await History.countDocuments();
    const chatCount = await Chat.countDocuments();

    res.json({
      status: "success",
      system_stats: {
        user_count: userCount || 0, // Matches key naming convention
        guest_count: guestCount || 0, // Use guestCount, not guest_count
        history_count: historyCount || 0,
        chat_count: chatCount || 0,
      },
    });
  } catch (error) {
    console.error("Stats fetch error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve stats",
    });
  }
});

router.get("/health", async (req, res) => {
  try {
    // Check database connection status
    const dbStatus = mongoose.connection.readyState;
    const dbStatusMessage =
      dbStatus === 1
        ? "connected"
        : dbStatus === 2
        ? "connecting"
        : dbStatus === 3
        ? "disconnecting"
        : "disconnected";

    // Get system uptime in a readable format (seconds)
    const uptime = process.uptime();
    const uptimeFormatted = formatUptime(uptime);

    // Get current timestamp in a readable format
    const timestampReadable = new Date().toLocaleString();

    // Respond with health check info
    res.json({
      status: "success",
      uptime: uptimeFormatted,
      timestamp: timestampReadable,
      database: dbStatusMessage,
    });
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      status: "error",
      message: "Health check failed",
    });
  }
});

// Helper function to format uptime (example: 3.12 seconds -> 3 seconds)
function formatUptime(uptime) {
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = (uptime % 60).toFixed(2);

  return `${hours}h ${minutes}m ${seconds}s`;
}

module.exports = router;
