require("dotenv").config();
const express = require("express");
const authenticateToken = require("../middleware/auth");
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

// Get user's subscription
router.get("/", authenticateToken, async (req, res) => {
  if (req.isGuest)
    return res.status(401).json({ message: "Authentication required" });

  try {
    const user = await User.findById(req.user.id).select("subscription");
    if (!user || !user.subscription) {
      return res.json({
        status: "success",
        subscription: {
          currentPlan: "free",
          features: { ...SUBSCRIPTION_PLANS.free },
          status: "active",
          expiresAt: null,
        },
      });
    }

    const subscription = await Subscription.findOne({
      userId: req.user.id,
      status: "active",
    });
    if (!subscription) {
      return res.json({
        status: "success",
        subscription: {
          currentPlan: "free",
          features: { ...SUBSCRIPTION_PLANS.free },
          status: "active",
          expiresAt: null,
        },
      });
    }

    res.json({
      status: "success",
      subscription: {
        currentPlan: subscription.plan,
        features: subscription.features,
        expiresAt: subscription.endDate,
        status: subscription.status,
        autoRenew: subscription.autoRenew,
      },
    });
  } catch (error) {
    console.error("Subscription fetch error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to retrieve subscription" });
  }
});

// Create or update subscription (pending admin approval)
router.post("/", authenticateToken, async (req, res) => {
  if (req.isGuest)
    return res.status(401).json({ message: "Authentication required" });

  try {
    const { plan } = req.body;
    if (!plan || !SUBSCRIPTION_PLANS[plan]) {
      return res.status(400).json({
        status: "error",
        message: `Invalid plan. Must be one of ${Object.keys(
          SUBSCRIPTION_PLANS
        ).join(", ")}.`,
      });
    }

    const user = await User.findById(req.user.id);
    if (!user)
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });

    let subscription = await Subscription.findOne({
      userId: req.user.id,
      status: "active",
    });

    if (subscription) {
      const newSubscription = new Subscription({
        userId: req.user.id,
        plan,
        previousPlan: subscription.plan,
        status: "pending",
        features: { ...SUBSCRIPTION_PLANS[plan] },
        startDate: new Date(),
        endDate: new Date(new Date().setDate(new Date().getDate() + 30)),
      });
      await newSubscription.save();

      await createNotification(
        req.user.id,
        "subscription",
        "Plan Change Requested",
        `Your request to change to the ${plan} plan is pending admin approval.`
      );

      res.json({
        status: "success",
        message: "Plan change request submitted for admin approval",
        subscription: {
          currentPlan: subscription.plan,
          pendingPlan: plan,
          status: "pending",
        },
      });
    } else {
      const newSubscription = new Subscription({
        userId: req.user.id,
        plan,
        previousPlan: "free",
        status: "pending",
        features: { ...SUBSCRIPTION_PLANS[plan] },
        startDate: new Date(),
        endDate: new Date(new Date().setDate(new Date().getDate() + 30)),
      });
      await newSubscription.save();

      await createNotification(
        req.user.id,
        "subscription",
        "Plan Change Requested",
        `Your request to subscribe to the ${plan} plan is pending admin approval.`
      );

      res.json({
        status: "success",
        message: "Subscription request submitted for admin approval",
        subscription: {
          currentPlan: "free",
          pendingPlan: plan,
          status: "pending",
        },
      });
    }
  } catch (error) {
    console.error("Subscription update error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to request subscription" });
  }
});

// Cancel subscription
router.post("/cancel", authenticateToken, async (req, res) => {
  if (req.isGuest)
    return res.status(401).json({ message: "Authentication required" });

  try {
    const subscription = await Subscription.findOne({
      userId: req.user.id,
      status: "active",
    });
    if (!subscription || subscription.plan === "free") {
      return res
        .status(404)
        .json({ status: "error", message: "No active subscription to cancel" });
    }

    subscription.status = "canceled";
    subscription.autoRenew = false;
    subscription.endDate = new Date();
    await subscription.save();

    const user = await User.findById(req.user.id);
    user.subscription = {
      currentPlan: "free",
      features: SUBSCRIPTION_PLANS.free,
      status: "active",
      expiresAt: null,
    };
    await user.save();

    await createNotification(
      req.user.id,
      "subscription",
      "Subscription Canceled",
      "Your subscription has been canceled. You are now on the free plan."
    );

    res.json({
      status: "success",
      message: "Subscription canceled successfully",
    });
  } catch (error) {
    console.error("Subscription cancellation error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to cancel subscription" });
  }
});

// Get subscription logs
router.get("/logs", authenticateToken, async (req, res) => {
  if (req.isGuest)
    return res.status(401).json({ message: "Authentication required" });

  try {
    const logs = await Subscription.find({ userId: req.user.id }).sort({
      updatedAt: -1,
    });
    res.json({ status: "success", logs });
  } catch (error) {
    console.error("Subscription logs fetch error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch subscription logs" });
  }
});

// Renew subscription manually
router.post("/renew", authenticateToken, async (req, res) => {
  if (req.isGuest)
    return res.status(401).json({ message: "Authentication required" });

  try {
    let subscription = await Subscription.findOne({
      userId: req.user.id,
      status: "active",
    });
    if (!subscription || subscription.plan === "free") {
      return res
        .status(400)
        .json({ status: "error", message: "No active subscription to renew" });
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    subscription.endDate = endDate;
    subscription.paymentDetails.lastRenewed = new Date();
    await subscription.save();

    const user = await User.findById(req.user.id);
    user.subscription.expiresAt = endDate;
    await user.save();

    await createNotification(
      req.user.id,
      "subscription",
      "Subscription Renewed",
      `Your ${subscription.plan} plan has been manually renewed for 30 days.`
    );

    res.json({
      status: "success",
      message: "Subscription renewed successfully",
      subscription: {
        currentPlan: subscription.plan,
        features: subscription.features,
        expiresAt: subscription.endDate,
        status: subscription.status,
      },
    });
  } catch (error) {
    console.error("Subscription renewal error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to renew subscription" });
  }
});

// Toggle auto-renewal
router.post("/auto-renew", authenticateToken, async (req, res) => {
  if (req.isGuest)
    return res.status(401).json({ message: "Authentication required" });

  try {
    const { enable } = req.body;
    if (typeof enable !== "boolean") {
      return res
        .status(400)
        .json({ status: "error", message: "Enable must be a boolean" });
    }

    const subscription = await Subscription.findOne({
      userId: req.user.id,
      status: "active",
    });
    if (!subscription || subscription.plan === "free") {
      return res
        .status(404)
        .json({ status: "error", message: "No active subscription found" });
    }

    subscription.autoRenew = enable;
    await subscription.save();

    await createNotification(
      req.user.id,
      "subscription",
      "Auto-Renewal Updated",
      `Auto-renewal has been ${enable ? "enabled" : "disabled"} for your ${
        subscription.plan
      } plan.`
    );

    res.json({
      status: "success",
      message: `Auto-renewal ${enable ? "enabled" : "disabled"}`,
      subscription: {
        currentPlan: subscription.plan,
        autoRenew: subscription.autoRenew,
      },
    });
  } catch (error) {
    console.error("Auto-renewal update error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to update auto-renewal" });
  }
});

module.exports = router;
