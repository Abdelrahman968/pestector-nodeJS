// --- START OF FILE routes/admin.js ---
const express = require("express");
const mongoose = require("mongoose");
const Joi = require("joi"); // For validation
const authenticateToken = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");

// Import Models
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const History = require("../models/History");
const GuestUser = require("../models/GuestUser");
const Contact = require("../models/Contact");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog"); // New model for audit logging
const { SUBSCRIPTION_PLANS } = require("../config/config");

const router = express.Router();

// Middleware stack for all admin routes
router.use(authenticateToken, isAdmin);

// Helper function for consistent error responses
const handleError = (res, error, message, statusCode = 500) => {
  console.error(`${message}:`, error);
  res
    .status(statusCode)
    .json({ status: "error", message, error: error.message });
};

// Helper function to create notification
const createNotification = async (userId, type, title, message) => {
  try {
    const notification = new Notification({ userId, type, title, message });
    await notification.save();
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

// Helper function to log admin actions
const logAdminAction = async (
  adminId,
  action,
  targetType,
  targetId,
  details = {},
) => {
  try {
    const auditLog = new AuditLog({
      adminId,
      action,
      targetType,
      targetId,
      details,
      timestamp: new Date(),
    });
    await auditLog.save();
  } catch (error) {
    console.error("Error logging admin action:", error);
  }
};

// --- User Management ---

// GET all users with pagination, search, and filters
router.get("/users", async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", role } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
      ];
    }
    if (role) query.role = role;

    const users = await User.find(query)
      .select("-password -twoFactorSecret")
      .populate("subscription.subscriptionId", "plan status endDate")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      status: "success",
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    handleError(res, error, "Failed to fetch users");
  }
});

// Bulk DELETE users
router.delete("/users/bulk", async (req, res) => {
  try {
    const { userIds } = req.body;
    const schema = Joi.array().items(Joi.string().hex().length(24)).required();
    const { error } = schema.validate(userIds);
    if (error)
      return res
        .status(400)
        .json({ status: "error", message: error.details[0].message });

    if (userIds.includes(req.user.id)) {
      return res
        .status(400)
        .json({ status: "error", message: "Cannot delete your own account" });
    }

    const result = await User.deleteMany({ _id: { $in: userIds } });
    await History.deleteMany({ userId: { $in: userIds } });
    await Subscription.deleteMany({ userId: { $in: userIds } });
    await Notification.deleteMany({ userId: { $in: userIds } });

    await logAdminAction(req.user.id, "bulk_delete", "user", userIds, {
      count: result.deletedCount,
    });

    res.json({
      status: "success",
      message: `${result.deletedCount} users deleted`,
    });
  } catch (error) {
    handleError(res, error, "Failed to bulk delete users");
  }
});

// Export users as CSV
router.get("/users/export", async (req, res) => {
  try {
    const users = await User.find({})
      .select("username email fullName role createdAt")
      .populate("subscription.subscriptionId", "plan status");
    const csv = [
      "Username,Email,Full Name,Role,Plan,Status,Joined",
      ...users.map(
        (u) =>
          `${u.username},${u.email},${u.fullName || ""},${u.role},${
            u.subscription?.currentPlan || "free"
          },${u.subscription?.status || "N/A"},${u.createdAt.toISOString()}`,
      ),
    ].join("\n");

    res.header("Content-Type", "text/csv");
    res.attachment("users_export.csv");
    res.send(csv);
  } catch (error) {
    handleError(res, error, "Failed to export users");
  }
});

// --- History Management ---

// Bulk DELETE history
router.delete("/history/bulk", async (req, res) => {
  try {
    const { historyIds } = req.body;
    const schema = Joi.array().items(Joi.string().hex().length(24)).required();
    const { error } = schema.validate(historyIds);
    if (error)
      return res
        .status(400)
        .json({ status: "error", message: error.details[0].message });

    const result = await History.deleteMany({ _id: { $in: historyIds } });
    await logAdminAction(req.user.id, "bulk_delete", "history", historyIds, {
      count: result.deletedCount,
    });

    res.json({
      status: "success",
      message: `${result.deletedCount} history entries deleted`,
    });
  } catch (error) {
    handleError(res, error, "Failed to bulk delete history");
  }
});

// --- Guest Management ---

// Bulk DELETE guests
router.delete("/guests/bulk", async (req, res) => {
  try {
    const { guestIds } = req.body;
    const schema = Joi.array().items(Joi.string().hex().length(24)).required();
    const { error } = schema.validate(guestIds);
    if (error)
      return res
        .status(400)
        .json({ status: "error", message: error.details[0].message });

    const guests = await GuestUser.find({ _id: { $in: guestIds } });
    const guestIdsList = guests.map((g) => g.guestId);
    await History.deleteMany({ guestId: { $in: guestIdsList } });
    const result = await GuestUser.deleteMany({ _id: { $in: guestIds } });

    await logAdminAction(req.user.id, "bulk_delete", "guest", guestIds, {
      count: result.deletedCount,
    });

    res.json({
      status: "success",
      message: `${result.deletedCount} guests deleted`,
    });
  } catch (error) {
    handleError(res, error, "Failed to bulk delete guests");
  }
});

// --- Contact Management ---

// Bulk DELETE contacts
router.delete("/contacts/bulk", async (req, res) => {
  try {
    const { contactIds } = req.body;
    const schema = Joi.array().items(Joi.string().hex().length(24)).required();
    const { error } = schema.validate(contactIds);
    if (error)
      return res
        .status(400)
        .json({ status: "error", message: error.details[0].message });

    const result = await Contact.deleteMany({ _id: { $in: contactIds } });
    await logAdminAction(req.user.id, "bulk_delete", "contact", contactIds, {
      count: result.deletedCount,
    });

    res.json({
      status: "success",
      message: `${result.deletedCount} contacts deleted`,
    });
  } catch (error) {
    handleError(res, error, "Failed to bulk delete contacts");
  }
});

// --- Analytics ---

router.get("/analytics/user-growth", async (req, res) => {
  try {
    const growth = await User.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.json({ status: "success", data: growth });
  } catch (error) {
    handleError(res, error, "Failed to fetch user growth analytics");
  }
});

router.get("/analytics/subscription-trends", async (req, res) => {
  try {
    const trends = await Subscription.aggregate([
      {
        $group: {
          _id: {
            month: { $dateToString: { format: "%Y-%m", date: "$startDate" } },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.month": 1 } },
    ]);
    res.json({ status: "success", data: trends });
  } catch (error) {
    handleError(res, error, "Failed to fetch subscription trends");
  }
});

// --- Dashboard Stats ---

router.get("/dashboard-stats", async (req, res) => {
  try {
    const [totalUsers, guestCount, historyCount] = await Promise.all([
      User.countDocuments({}),
      GuestUser.countDocuments({}),
      History.countDocuments({}),
    ]);
    res.json({
      status: "success",
      stats: { totalUsers, guestCount, historyCount },
    });
  } catch (error) {
    handleError(res, error, "Failed to fetch dashboard stats");
  }
});

// UPDATE specific user details (limited fields for security)
router.put("/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { fullName, email, phoneNumber, role } = req.body; // Allow updating these fields

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid User ID format" });
    }

    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (role !== undefined && ["user", "admin"].includes(role)) {
      // Ensure the admin isn't demoting the last admin or themselves (add more checks if needed)
      if (req.user.id === userId && role === "user") {
        return res.status(400).json({
          status: "error",
          message: "Admin cannot demote themselves.",
        });
      }
      updateData.role = role;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true, // Return the updated document
      runValidators: true, // Run schema validators
    }).select("-password -twoFactorSecret");

    if (!updatedUser) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }

    await createNotification(
      userId,
      "system",
      "Account Updated",
      "Your account details have been updated by an administrator.",
    );

    res.json({
      status: "success",
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    if (error.code === 11000) {
      // Handle duplicate key errors (e.g., email/phone)
      handleError(
        res,
        error,
        "Update failed: Email or phone number may already be in use.",
        409,
      );
    } else if (error.name === "ValidationError") {
      handleError(res, error, `Update failed: ${error.message}`, 400);
    } else {
      handleError(res, error, "Failed to update user");
    }
  }
});

// DELETE a user
router.delete("/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid User ID format" });
    }

    // Prevent admin from deleting themselves
    if (req.user.id === userId) {
      return res.status(400).json({
        status: "error",
        message: "Admin cannot delete their own account.",
      });
    }

    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }

    // Add checks: maybe prevent deleting the *last* admin?
    // const adminCount = await User.countDocuments({ role: 'admin' });
    // if (userToDelete.role === 'admin' && adminCount <= 1) {
    //     return res.status(400).json({ status: "error", message: "Cannot delete the last administrator." });
    // }

    // Perform deletion - consider cascading deletes or cleanup
    await History.deleteMany({ userId: userId });
    await Subscription.deleteMany({ userId: userId });
    await Notification.deleteMany({ userId: userId });
    // await Chat.deleteMany({ userId: userId }); // Add if Chat model uses userId
    // await Plant.deleteMany({ userId: userId }); // Add if Plant model uses userId
    // ... other related data

    await User.findByIdAndDelete(userId);

    // No notification needed as the user is deleted.

    res.json({ status: "success", message: "User deleted successfully" });
  } catch (error) {
    handleError(res, error, "Failed to delete user");
  }
});

// --- History Management ---

// GET all history entries with pagination and search
router.get("/history", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || ""; // Search by filename, user email/username, plant/condition
    const userId = req.query.userId || ""; // Filter by specific user ID
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query.$or = [
        { filename: { $regex: search, $options: "i" } },
        {
          "classification.prediction.plant": { $regex: search, $options: "i" },
        },
        {
          "classification.prediction.condition": {
            $regex: search,
            $options: "i",
          },
        },
        // Add search by populated user fields if needed (requires extra lookup or denormalization)
      ];
    }
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      query.userId = userId;
    } else if (userId) {
      return res.status(400).json({
        status: "error",
        message: "Invalid User ID format for filtering",
      });
    }

    const history = await History.find(query)
      .populate("userId", "username email") // Populate user details
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await History.countDocuments(query);

    res.json({
      status: "success",
      history,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    handleError(res, error, "Failed to fetch history entries");
  }
});

// DELETE a specific history entry
router.delete("/history/:historyId", async (req, res) => {
  try {
    const { historyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(historyId)) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid History ID format" });
    }

    const deletedHistory = await History.findByIdAndDelete(historyId);

    if (!deletedHistory) {
      return res
        .status(404)
        .json({ status: "error", message: "History entry not found" });
    }

    // Optional: Decrement user's scan count if you track it that way
    if (deletedHistory.userId) {
      await User.findByIdAndUpdate(deletedHistory.userId, {
        $inc: { scanCount: -1 },
      });
    }

    res.json({
      status: "success",
      message: "History entry deleted successfully",
    });
  } catch (error) {
    handleError(res, error, "Failed to delete history entry");
  }
});

// --- Guest User Management ---

// GET all guest users with pagination and search
router.get("/guests", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || ""; // Search by guestId or IP
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query = {
        $or: [
          { guestId: { $regex: search, $options: "i" } },
          { ipAddress: { $regex: search, $options: "i" } },
        ],
      };
    }

    const guests = await GuestUser.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await GuestUser.countDocuments(query);

    res.json({
      status: "success",
      guests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    handleError(res, error, "Failed to fetch guest users");
  }
});

// DELETE a specific guest user (and potentially their history)
router.delete("/guests/:guestDbId", async (req, res) => {
  // Using DB ID here
  try {
    const { guestDbId } = req.params; // Assuming this is the MongoDB _id
    if (!mongoose.Types.ObjectId.isValid(guestDbId)) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid Guest DB ID format" });
    }

    const guestToDelete = await GuestUser.findById(guestDbId);
    if (!guestToDelete) {
      return res
        .status(404)
        .json({ status: "error", message: "Guest user not found" });
    }

    // Delete associated history for this guest
    await History.deleteMany({ guestId: guestToDelete.guestId });
    // await Chat.deleteMany({ guestId: guestToDelete.guestId }); // Add if needed
    // ... other guest-related data

    await GuestUser.findByIdAndDelete(guestDbId);

    res.json({
      status: "success",
      message: "Guest user and associated data deleted successfully",
    });
  } catch (error) {
    handleError(res, error, "Failed to delete guest user");
  }
});

// --- Contact Submissions Management ---

// GET all contact submissions
router.get("/contacts", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const contacts = await Contact.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Contact.countDocuments({});

    res.json({
      status: "success",
      contacts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    handleError(res, error, "Failed to fetch contact submissions");
  }
});

// DELETE a contact submission
router.delete("/contacts/:contactId", async (req, res) => {
  try {
    const { contactId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid Contact ID format" });
    }

    const deletedContact = await Contact.findByIdAndDelete(contactId);
    if (!deletedContact) {
      return res
        .status(404)
        .json({ status: "error", message: "Contact submission not found" });
    }
    res.json({
      status: "success",
      message: "Contact submission deleted successfully",
    });
  } catch (error) {
    handleError(res, error, "Failed to delete contact submission");
  }
});

// --- Notification Sending ---

// POST Send notification (reuse existing logic, but ensure admin check is redundant here)
router.post("/notifications/send", async (req, res) => {
  try {
    const { title, message, type = "system", userId = null } = req.body; // Default type to 'system'

    // Validate input
    if (!title || !message || !type) {
      return res.status(400).json({
        status: "error",
        message: "Title, message, and type are required",
      });
    }
    if (
      !["system", "subscription", "scan", "security", "feature"].includes(type)
    ) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid notification type" });
    }

    if (userId) {
      // Send to specific user
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res
          .status(400)
          .json({ status: "error", message: "Invalid User ID format" });
      }
      const userExists = await User.findById(userId);
      if (!userExists) {
        return res
          .status(404)
          .json({ status: "error", message: "Target user not found" });
      }
      await createNotification(userId, type, title, message);
      res.json({
        status: "success",
        message: `Notification sent to user ${userId}`,
      });
    } else {
      // Send to all users
      const users = await User.find({}, "_id"); // Get only IDs for efficiency
      const notificationPromises = users.map((user) =>
        createNotification(user._id, type, title, message),
      );
      await Promise.all(notificationPromises);
      res.json({
        status: "success",
        message: `Notification sent to ${users.length} users`,
      });
    }
  } catch (error) {
    handleError(res, error, "Failed to send notification");
  }
});

// --- Subscription Management (using the dedicated admin route) ---
// Routes like GET /admin/subscriptions/all, POST /admin/subscriptions/approve/:id etc.
// will be handled by mounting adminSubscriptions.js under /admin/subscriptions in index.js

module.exports = router;
// --- END OF FILE routes/admin.js ---
