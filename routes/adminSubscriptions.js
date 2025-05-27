require("dotenv").config();
const express = require("express");
const authenticateToken = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { SUBSCRIPTION_PLANS } = require("../config/config");

const router = express.Router();

// Helper function to create notification
const createNotification = async (userId, type, title, message) => {
  try {
    const notification = new Notification({ userId, type, title, message });
    await notification.save();
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

// Admin: Get all subscriptions
router.get("/all", authenticateToken, isAdmin, async (req, res) => {
  if (req.isGuest || req.user.role !== "admin") {
    return res
      .status(403)
      .json({ status: "error", message: "Access denied: Admins only" });
  }

  try {
    const subscriptions = await Subscription.find().populate(
      "userId",
      "email username"
    );
    res.json({ status: "success", subscriptions });
  } catch (error) {
    console.error("Fetch all subscriptions error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch subscriptions" });
  }
});

// Admin: Approve or reject subscription request
router.post(
  "/approve/:subscriptionId",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    if (req.isGuest || req.user.role !== "admin") {
      return res
        .status(403)
        .json({ status: "error", message: "Access denied: Admins only" });
    }

    try {
      const { subscriptionId } = req.params;
      const { action } = req.body; // "approve" or "reject"

      if (!["approve", "reject"].includes(action)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid action. Must be 'approve' or 'reject'.",
        });
      }

      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription || subscription.status !== "pending") {
        return res
          .status(404)
          .json({ status: "error", message: "Pending subscription not found" });
      }

      const user = await User.findById(subscription.userId);
      if (!user)
        return res
          .status(404)
          .json({ status: "error", message: "User not found" });

      if (action === "approve") {
        await Subscription.updateMany(
          { userId: subscription.userId, status: "active" },
          { status: "expired", endDate: new Date() }
        );

        subscription.status = "active";
        await subscription.save();

        user.subscription = {
          currentPlan: subscription.plan,
          status: "active",
          subscriptionId: subscription._id,
          features: subscription.features,
          expiresAt: subscription.endDate,
        };
        await user.save();

        await createNotification(
          subscription.userId,
          "subscription",
          "Subscription Approved",
          `Your request to change to the ${subscription.plan} plan has been approved.`
        );

        res.json({
          status: "success",
          message: `Subscription approved. Plan set to '${subscription.plan}'.`,
          subscription: {
            currentPlan: subscription.plan,
            features: subscription.features,
            expiresAt: subscription.endDate,
            status: subscription.status,
          },
        });
      } else if (action === "reject") {
        subscription.status = "canceled";
        await subscription.save();

        await createNotification(
          subscription.userId,
          "subscription",
          "Subscription Rejected",
          `Your request to change to the ${subscription.plan} plan has been rejected.`
        );

        res.json({
          status: "success",
          message: "Subscription request rejected.",
        });
      }
    } catch (error) {
      console.error("Subscription approval error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to process subscription request",
      });
    }
  }
);

// Admin: Force expire a subscription
router.post(
  "/expire/:subscriptionId",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    if (req.isGuest || req.user.role !== "admin") {
      return res
        .status(403)
        .json({ status: "error", message: "Access denied: Admins only" });
    }

    try {
      const { subscriptionId } = req.params;
      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription) {
        return res
          .status(404)
          .json({ status: "error", message: "Subscription not found" });
      }

      subscription.status = "expired";
      subscription.endDate = new Date();
      await subscription.save();

      const user = await User.findById(subscription.userId);
      user.subscription = {
        currentPlan: "free",
        features: SUBSCRIPTION_PLANS.free,
        status: "active",
        expiresAt: null,
      };
      await user.save();

      await createNotification(
        subscription.userId,
        "subscription",
        "Subscription Expired",
        "Your subscription has been manually expired by an admin. You are now on the free plan."
      );

      res.json({
        status: "success",
        message: "Subscription expired successfully",
      });
    } catch (error) {
      console.error("Force expire subscription error:", error);
      res
        .status(500)
        .json({ status: "error", message: "Failed to expire subscription" });
    }
  }
);

// Admin: Delete a subscription
router.delete(
  "/delete/:subscriptionId",
  authenticateToken,
  async (req, res) => {
    if (req.isGuest || req.user.role !== "admin") {
      return res
        .status(403)
        .json({ status: "error", message: "Access denied: Admins only" });
    }

    try {
      const { subscriptionId } = req.params;
      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription) {
        return res
          .status(404)
          .json({ status: "error", message: "Subscription not found" });
      }

      const user = await User.findById(subscription.userId);
      if (!user)
        return res
          .status(404)
          .json({ status: "error", message: "User not found" });

      // If this is the active subscription, reset user's subscription to free
      if (subscription.status === "active") {
        user.subscription = {
          currentPlan: "free",
          features: SUBSCRIPTION_PLANS.free,
          status: "active",
          expiresAt: null,
        };
        await user.save();
      }

      await Subscription.deleteOne({ _id: subscriptionId });

      await createNotification(
        subscription.userId,
        "subscription",
        "Subscription Deleted",
        "Your subscription has been deleted by an admin."
      );

      res.json({
        status: "success",
        message: "Subscription deleted successfully",
      });
    } catch (error) {
      console.error("Delete subscription error:", error);
      res
        .status(500)
        .json({ status: "error", message: "Failed to delete subscription" });
    }
  }
);

// Admin: Approve or reject subscription request
router.post("/approve/:subscriptionId", authenticateToken, async (req, res) => {
  if (req.isGuest || req.user.role !== "admin") {
    return res
      .status(403)
      .json({ status: "error", message: "Access denied: Admins only" });
  }

  try {
    const { subscriptionId } = req.params;
    const { action } = req.body; // "approve" or "reject"

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid action. Must be 'approve' or 'reject'.",
      });
    }

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription || subscription.status !== "pending") {
      return res
        .status(404)
        .json({ status: "error", message: "Pending subscription not found" });
    }

    const user = await User.findById(subscription.userId);
    if (!user)
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });

    if (action === "approve") {
      await Subscription.updateMany(
        { userId: subscription.userId, status: "active" },
        { status: "expired", endDate: new Date() }
      );

      subscription.status = "active"; // Changed from immediate "active" to reflect UI
      await subscription.save();

      user.subscription = {
        currentPlan: subscription.plan,
        status: "active",
        subscriptionId: subscription._id,
        features: subscription.features,
        expiresAt: subscription.endDate,
      };
      await user.save();

      await createNotification(
        subscription.userId,
        "subscription",
        "Subscription Approved",
        `Your request to change to the ${subscription.plan} plan has been approved and is now active.`
      );

      res.json({
        status: "success",
        message: `Subscription approved and activated. Plan set to '${subscription.plan}'.`,
        subscription: {
          currentPlan: subscription.plan,
          features: subscription.features,
          expiresAt: subscription.endDate,
          status: subscription.status,
        },
      });
    } else if (action === "reject") {
      subscription.status = "rejected"; // Changed from "canceled" to "rejected"
      await subscription.save();

      await createNotification(
        subscription.userId,
        "subscription",
        "Subscription Rejected",
        `Your request to change to the ${subscription.plan} plan has been rejected.`
      );

      res.json({
        status: "success",
        message: "Subscription request rejected.",
      });
    }
  } catch (error) {
    console.error("Subscription approval error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to process subscription request",
    });
  }
});

module.exports = router;
