const express = require("express");
const authenticateToken = require("../middleware/auth");
const Notification = require("../models/Notification");

const router = express.Router();

// Send notification to a specific user or all users (Admin only)
router.post("/send", authenticateToken, async (req, res) => {
  if (req.isGuest)
    return res.status(401).json({ message: "Authentication required" });

  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Access forbidden: Admins only" });

  try {
    const { message, userId = null } = req.body;

    // Validate the message field
    if (!message || typeof message !== "string" || message.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Message is required and must be a non-empty string",
      });
    }

    // Create the notification
    const notificationData = {
      message,
      createdAt: new Date(),
      read: false,
    };

    // If a userId is provided, send the notification to that user
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      // Send the notification to the specific user
      notificationData.userId = userId;
      await Notification.create(notificationData);
      res.json({
        status: "success",
        message: `Notification sent to user with ID ${userId}`,
      });
    } else {
      // If no userId is provided, send the notification to all users
      const users = await User.find(); // You can filter specific users if needed
      const notifications = users.map(async (user) => {
        notificationData.userId = user._id;
        return Notification.create(notificationData);
      });

      await Promise.all(notifications); // Wait for all notifications to be created
      res.json({
        status: "success",
        message: "Notification sent to all users",
      });
    }
  } catch (error) {
    console.error("Send notification error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to send notification",
    });
  }
});

// Get user notifications
router.get("/", authenticateToken, async (req, res) => {
  if (req.isGuest)
    return res.status(401).json({ message: "Authentication required" });

  try {
    const { limit = 20, offset = 0, unreadOnly = false } = req.query;

    // Validate limit and offset to be positive integers
    const limitInt = Math.max(1, parseInt(limit));
    const offsetInt = Math.max(0, parseInt(offset));

    const query = { userId: req.user.id };
    if (unreadOnly === "true") {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(offsetInt)
      .limit(limitInt);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      userId: req.user.id,
      read: false,
    });

    res.json({
      status: "success",
      notifications,
      pagination: {
        total,
        unreadCount,
        limit: limitInt,
        offset: offsetInt,
      },
    });
  } catch (error) {
    console.error("Notifications fetch error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve notifications",
    });
  }
});

// Mark notification as read
router.put("/:id/read", authenticateToken, async (req, res) => {
  if (req.isGuest)
    return res.status(401).json({ message: "Authentication required" });

  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({
        status: "error",
        message: "Notification not found",
      });
    }

    notification.read = true;
    await notification.save();

    res.json({
      status: "success",
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Notification update error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to update notification",
    });
  }
});

// Mark all notifications as read
router.put("/read-all", authenticateToken, async (req, res) => {
  if (req.isGuest)
    return res.status(401).json({ message: "Authentication required" });

  try {
    const result = await Notification.updateMany(
      { userId: req.user.id, read: false },
      { $set: { read: true } }
    );

    if (result.nModified === 0) {
      return res.status(404).json({
        status: "error",
        message: "No unread notifications found",
      });
    }

    res.json({
      status: "success",
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Notification update error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to mark notifications as read",
    });
  }
});

// Delete a notification
router.delete("/:id", authenticateToken, async (req, res) => {
  if (req.isGuest)
    return res.status(401).json({ message: "Authentication required" });

  try {
    const result = await Notification.deleteOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Notification not found",
      });
    }

    res.json({
      status: "success",
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Notification deletion error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to delete notification",
    });
  }
});

module.exports = router;
