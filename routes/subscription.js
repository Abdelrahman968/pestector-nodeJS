require("dotenv").config();
const express = require("express");
const authenticateToken = require("../middleware/auth");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { SUBSCRIPTION_PLANS } = require("../config/config");

const router = express.Router();

// Helper to get user details
const getUserDetails = async (userId) => {
  return await User.findById(userId).select("username email");
};

// Helper to get subscription with user details
const getSubscriptionWithUser = async (subscriptionId) => {
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) return null;

  const user = await getUserDetails(subscription.userId);
  if (!user) return null;

  return {
    subscription,
    user,
  };
};

// Helper to get full subscription details
const getFullSubscriptionDetails = async (subscriptionId) => {
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) return null;

  const user = await getUserDetails(subscription.userId);
  if (!user) return null;

  return {
    ...subscription.toObject(),
    username: user.username,
    email: user.email,
    userId: user._id,
  };
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

// Middleware to check admin access
const checkAdmin = async (req, res, next) => {
  try {
    if (req.isGuest) {
      return res
        .status(403)
        .json({ status: "error", message: "Admin access required" });
    }
    const user = await User.findById(req.user.id);
    if (!user || user.role !== "admin") {
      return res
        .status(403)
        .json({ status: "error", message: "Admin access required" });
    }
    next();
  } catch (error) {
    console.error("[checkAdmin] Error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to verify admin access" });
  }
};

// Get user's subscription with scan usage
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
          scanUsage: 0,
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
          scanUsage: 0,
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
        scanUsage: subscription.getCurrentScanCount(),
      },
    });
  } catch (error) {
    console.error("Subscription fetch error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to retrieve subscription" });
  }
});

// Record a new scan
router.post("/scan", authenticateToken, async (req, res) => {
  if (req.isGuest)
    return res
      .status(401)
      .json({ status: "error", message: "Authentication required" });

  try {
    const subscription = await Subscription.findOne({
      userId: req.user.id,
      status: "active",
    });

    const user = await User.findById(req.user.id);
    if (!user)
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });

    const plan = subscription ? subscription.plan : "free";
    const scanLimit = SUBSCRIPTION_PLANS[plan].features.scanLimit;
    const currentScans = subscription ? subscription.getCurrentScanCount() : 0;

    if (currentScans >= scanLimit) {
      await createNotification(
        req.user.id,
        "subscription",
        "Scan Limit Reached",
        `You have reached your scan limit of ${scanLimit} for the ${plan} plan.`
      );
      return res.status(403).json({
        status: "error",
        message: "Scan limit reached for this billing cycle",
      });
    }

    if (subscription) {
      subscription.scanUsage.push({ timestamp: new Date() });
      await subscription.save();
    }

    await createNotification(
      req.user.id,
      "subscription",
      "Scan Recorded",
      `A new scan has been recorded. ${
        currentScans + 1
      }/${scanLimit} scans used this cycle.`
    );

    res.json({
      status: "success",
      message: "Scan recorded successfully",
      scanUsage: currentScans + 1,
      scanLimit,
    });
  } catch (error) {
    console.error("Scan recording error:", error);
    res.status(500).json({ status: "error", message: "Failed to record scan" });
  }
});

// Get scan usage
router.get("/scan-usage", authenticateToken, async (req, res) => {
  if (req.isGuest)
    return res
      .status(401)
      .json({ status: "error", message: "Authentication required" });

  try {
    const subscription = await Subscription.findOne({
      userId: req.user.id,
      status: "active",
    });

    const plan = subscription ? subscription.plan : "free";
    const scanLimit = SUBSCRIPTION_PLANS[plan].features.scanLimit;
    const currentScans = subscription ? subscription.getCurrentScanCount() : 0;

    res.json({
      status: "success",
      scanUsage: currentScans,
      scanLimit,
      plan,
    });
  } catch (error) {
    console.error("Scan usage fetch error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch scan usage" });
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
        features: { ...SUBSCRIPTION_PLANS[plan].features },
        startDate: new Date(),
        endDate: new Date(new Date().setDate(new Date().getDate() + 30)),
        scanUsage: [],
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
        features: { ...SUBSCRIPTION_PLANS[plan].features },
        startDate: new Date(),
        endDate: new Date(new Date().setDate(new Date().getDate() + 30)),
        scanUsage: [],
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
    subscription.scanUsage = [];
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
    subscription.paymentDetails = subscription.paymentDetails || {};
    subscription.paymentDetails.lastRenewed = new Date();
    subscription.resetScanUsage();
    await subscription.save();

    const user = await User.findById(req.user.id);
    user.subscription.expiresAt = endDate;
    await user.save();

    await createNotification(
      req.user.id,
      "subscription",
      "Subscription Renewed",
      `Your ${subscription.plan} plan has been manually renewed for 30 days. Scan usage has been reset.`
    );

    res.json({
      status: "success",
      message: "Subscription renewed successfully",
      subscription: {
        currentPlan: subscription.plan,
        features: subscription.features,
        expiresAt: subscription.endDate,
        status: subscription.status,
        scanUsage: 0,
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

// Reset scan usage (for specific user or all users)
router.post(
  "/reset-scan-usage",
  authenticateToken,
  checkAdmin,
  async (req, res) => {
    try {
      const { userId } = req.body; // Optional: userId for specific user

      if (userId) {
        // Reset scan usage for a specific user
        const user = await User.findById(userId);
        if (!user) {
          return res
            .status(404)
            .json({ status: "error", message: "User not found" });
        }

        const subscription = await Subscription.findOne({
          userId: userId,
          status: "active",
        });

        if (!subscription) {
          return res.status(404).json({
            status: "error",
            message: "No active subscription found for the user",
          });
        }

        subscription.scanUsage = [];
        await subscription.save();

        await createNotification(
          userId,
          "subscription",
          "Scan Usage Reset",
          `Your scan usage has been reset by an admin. You now have 0/${subscription.features.scanLimit} scans used this cycle.`
        );

        res.json({
          status: "success",
          message: `Scan usage reset successfully for user ${userId}`,
          userId,
          scanUsage: 0,
          scanLimit: subscription.features.scanLimit,
        });
      } else {
        // Reset scan usage for all users
        const subscriptions = await Subscription.find({ status: "active" });
        const resetCount = subscriptions.length;

        for (const subscription of subscriptions) {
          subscription.scanUsage = [];
          await subscription.save();

          await createNotification(
            subscription.userId,
            "subscription",
            "Scan Usage Reset",
            `Your scan usage has been reset by an admin. You now have 0/${subscription.features.scanLimit} scans used this cycle.`
          );
        }

        res.json({
          status: "success",
          message: `Scan usage reset successfully for ${resetCount} users`,
          resetCount,
        });
      }
    } catch (error) {
      console.error("[POST /subscription/reset-scan-usage] Error:", error);
      res
        .status(500)
        .json({ status: "error", message: "Failed to reset scan usage" });
    }
  }
);

// Approve subscription (admin only)
router.post(
  "/approve/:subscriptionId",
  authenticateToken,
  checkAdmin,
  async (req, res) => {
    try {
      const { subscriptionId } = req.params;
      const subscription = await Subscription.findById(subscriptionId);

      if (!subscription) {
        return res.status(404).json({
          status: "error",
          message: "Subscription not found",
        });
      }

      if (subscription.status !== "pending") {
        return res.status(400).json({
          status: "error",
          message: "Only pending subscriptions can be approved",
        });
      }

      // Get user details
      const user = await User.findById(subscription.userId);
      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      // Cancel any existing active subscription
      await Subscription.updateMany(
        {
          userId: subscription.userId,
          status: "active",
        },
        {
          status: "canceled",
          endDate: new Date(),
        }
      );

      // Activate the new subscription
      subscription.status = "active";
      subscription.startDate = new Date();
      subscription.endDate = new Date(
        new Date().setDate(new Date().getDate() + 30)
      );
      await subscription.save();

      // Update user record
      user.subscription = {
        currentPlan: subscription.plan,
        features: subscription.features,
        status: "active",
        expiresAt: subscription.endDate,
      };
      await user.save();

      await createNotification(
        subscription.userId,
        "subscription",
        "Subscription Approved",
        `Your ${subscription.plan} plan has been approved and is now active.`
      );

      res.json({
        status: "success",
        message: "Subscription approved successfully",
        subscription: {
          id: subscription._id,
          userId: subscription.userId,
          username: user.username,
          email: user.email,
          plan: subscription.plan,
          previousPlan: subscription.previousPlan,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          autoRenew: subscription.autoRenew,
          scanUsage: subscription.getCurrentScanCount(),
          scanLimit: subscription.features.scanLimit,
        },
      });
    } catch (error) {
      console.error("Subscription approval error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to approve subscription",
      });
    }
  }
);

// Get subscription details (admin view)
router.get(
  "/:subscriptionId",
  authenticateToken,
  checkAdmin,
  async (req, res) => {
    try {
      const { subscriptionId } = req.params;
      const subscription = await Subscription.findById(subscriptionId);

      if (!subscription) {
        return res.status(404).json({
          status: "error",
          message: "Subscription not found",
        });
      }

      const user = await User.findById(subscription.userId);
      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      res.json({
        status: "success",
        subscription: {
          id: subscription._id,
          userId: subscription.userId,
          username: user.username,
          email: user.email,
          plan: subscription.plan,
          previousPlan: subscription.previousPlan,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          autoRenew: subscription.autoRenew,
          scanUsage: subscription.getCurrentScanCount(),
          scanLimit: subscription.features.scanLimit,
          updatedAt: subscription.updatedAt,
        },
      });
    } catch (error) {
      console.error("Subscription fetch error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch subscription details",
      });
    }
  }
);

// Get all subscriptions (admin view)
router.get("/admin/all", authenticateToken, checkAdmin, async (req, res) => {
  try {
    const subscriptions = await Subscription.find().sort({ updatedAt: -1 });

    const subscriptionsWithUsers = await Promise.all(
      subscriptions.map(async (sub) => {
        const user = await User.findById(sub.userId).select("username email");
        return {
          ...sub.toObject(),
          username: user?.username || "Unknown",
          email: user?.email || "N/A",
          userId: sub.userId,
          user: {
            // Include full user details
            _id: user?._id,
            username: user?.username,
            email: user?.email,
          },
        };
      })
    );

    res.json({
      status: "success",
      subscriptions: subscriptionsWithUsers,
    });
  } catch (error) {
    console.error("Subscriptions fetch error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch subscriptions",
    });
  }
});

// Expire subscription (admin)
router.post(
  "/:subscriptionId/expire",
  authenticateToken,
  checkAdmin,
  async (req, res) => {
    try {
      const { subscriptionId } = req.params;
      const result = await getSubscriptionWithUser(subscriptionId);

      if (!result) {
        return res.status(404).json({
          status: "error",
          message: "Subscription or user not found",
        });
      }

      const { subscription, user } = result;

      subscription.status = "expired";
      subscription.endDate = new Date();
      await subscription.save();

      // Update user record if needed
      if (user.subscription?.currentPlan === subscription.plan) {
        user.subscription.status = "expired";
        await user.save();
      }

      await createNotification(
        subscription.userId,
        "subscription",
        "Subscription Expired",
        `Your ${subscription.plan} plan has been manually expired by admin.`
      );

      res.json({
        status: "success",
        message: "Subscription expired successfully",
        subscription: {
          id: subscription._id,
          userId: subscription.userId,
          username: user.username,
          plan: subscription.plan,
          status: subscription.status,
          endDate: subscription.endDate,
        },
      });
    } catch (error) {
      console.error("Subscription expiration error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to expire subscription",
      });
    }
  }
);

// View user profile (admin)
router.get("/user/:userId", authenticateToken, checkAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    const subscriptions = await Subscription.find({ userId }).sort({
      updatedAt: -1,
    });

    res.json({
      status: "success",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      subscriptions: subscriptions.map((sub) => ({
        id: sub._id,
        plan: sub.plan,
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        autoRenew: sub.autoRenew,
      })),
    });
  } catch (error) {
    console.error("User profile fetch error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch user profile",
    });
  }
});

// Get subscription with full user details
router.get("/details/:id", authenticateToken, checkAdmin, async (req, res) => {
  try {
    const subscription = await getFullSubscriptionDetails(req.params.id);
    if (!subscription) {
      return res.status(404).json({
        status: "error",
        message: "Subscription not found",
      });
    }
    res.json({ status: "success", subscription });
  } catch (error) {
    console.error("Subscription details error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to get subscription details",
    });
  }
});

// Update user's plan (admin)
router.put("/:id/plan", authenticateToken, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPlan } = req.body;

    if (!SUBSCRIPTION_PLANS[newPlan]) {
      return res.status(400).json({
        status: "error",
        message: "Invalid plan specified",
      });
    }

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return res.status(404).json({
        status: "error",
        message: "Subscription not found",
      });
    }

    const user = await User.findById(subscription.userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Store previous plan
    const previousPlan = subscription.plan;

    // Update subscription
    subscription.plan = newPlan;
    subscription.features = SUBSCRIPTION_PLANS[newPlan].features;
    subscription.previousPlan = previousPlan;
    await subscription.save();

    // Update user record
    user.subscription = {
      currentPlan: newPlan,
      features: SUBSCRIPTION_PLANS[newPlan].features,
      status: subscription.status,
      expiresAt: subscription.endDate,
    };
    await user.save();

    await createNotification(
      user._id,
      "subscription",
      "Plan Updated",
      `Your plan has been changed from ${previousPlan} to ${newPlan} by admin.`
    );

    res.json({
      status: "success",
      message: "Plan updated successfully",
      subscription: {
        id: subscription._id,
        userId: user._id,
        username: user.username,
        previousPlan,
        newPlan,
        status: subscription.status,
        features: subscription.features,
      },
    });
  } catch (error) {
    console.error("Plan update error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to update plan",
    });
  }
});

// Expire subscription (admin only)
router.post(
  "/expire/:subscriptionId",
  authenticateToken,
  checkAdmin,
  async (req, res) => {
    try {
      const { subscriptionId } = req.params;
      const result = await getSubscriptionWithUser(subscriptionId);

      if (!result) {
        return res.status(404).json({
          status: "error",
          message: "Subscription or user not found",
        });
      }

      const { subscription, user } = result;

      // Update subscription
      subscription.status = "expired";
      subscription.endDate = new Date();
      await subscription.save();

      // Update user record if needed
      if (user.subscription?.currentPlan === subscription.plan) {
        user.subscription.status = "expired";
        await user.save();
      }

      await createNotification(
        subscription.userId,
        "subscription",
        "Subscription Expired",
        `Your ${subscription.plan} plan has been manually expired by admin.`
      );

      res.json({
        status: "success",
        message: "Subscription expired successfully",
        subscription: {
          id: subscription._id,
          userId: subscription.userId,
          username: user.username,
          plan: subscription.plan,
          status: subscription.status,
          endDate: subscription.endDate,
        },
      });
    } catch (error) {
      console.error("Subscription expiration error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to expire subscription",
      });
    }
  }
);

module.exports = router;
module.exports.createNotification = createNotification;
