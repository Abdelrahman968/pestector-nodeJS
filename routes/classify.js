const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises; // Use promises version for async/await
const mkdirp = require("mkdirp");
const axios = require("axios");
const FormData = require("form-data");

const {
  PYTHON_API_URL,
  API_KEYS,
  MAX_GUEST_SCANS,
  SUBSCRIPTION_PLANS,
} = require("../config/config");
const authenticateToken = require("../middleware/auth");
const { getGuestId, trackGuestScan } = require("../middleware/guest");
const History = require("../models/History");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const GuestUser = require("../models/GuestUser");

const router = express.Router();

// Multer configuration
const configureMulter = () => {
  const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = path.join(__dirname, "../uploads");
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const ext = path.extname(file.originalname);
      cb(null, `upload_${timestamp}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith("image/")) {
        return cb(new Error("Only image files are allowed"), false);
      }
      cb(null, true);
    },
  });
};

const upload = configureMulter();

// Utility functions
const getTodayStart = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const getUserSubscriptionInfo = async (userId) => {
  const subscription = await Subscription.findOne({
    userId,
    status: "active",
    endDate: { $gt: new Date() },
  });

  return {
    plan: subscription?.plan || "free",
    scanLimit:
      subscription?.features.scanLimit || SUBSCRIPTION_PLANS.free.scanLimit,
    hasAdvancedAnalytics:
      subscription?.features.advancedAnalytics ||
      SUBSCRIPTION_PLANS.free.advancedAnalytics ||
      false,
  };
};

const countDailyScans = async (userId) => {
  return History.countDocuments({
    userId,
    timestamp: { $gte: getTodayStart() },
  });
};

// Middleware
const checkScanLimit = async (req, res, next) => {
  try {
    if (req.isGuest) return next();

    const user = await User.findById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }

    const { plan, scanLimit, hasAdvancedAnalytics } =
      await getUserSubscriptionInfo(user._id);
    const scansMadeToday = await countDailyScans(user._id);

    if (scansMadeToday >= scanLimit) {
      return res.status(403).json({
        status: "error",
        message: "Daily scan limit reached",
        subscription_info: {
          plan,
          scan_limit: scanLimit,
          scans_used: scansMadeToday,
          scans_remaining: 0,
          has_advanced_analytics: hasAdvancedAnalytics,
        },
      });
    }

    req.subscriptionInfo = {
      plan,
      scanLimit,
      scansUsed: scansMadeToday,
      scansRemaining: scanLimit - scansMadeToday,
      hasAdvancedAnalytics,
    };

    next();
  } catch (error) {
    console.error("Error in checkScanLimit:", error);
    req.subscriptionInfo = {
      ...SUBSCRIPTION_PLANS.free,
      plan: "free",
      scansUsed: 0,
      scansRemaining: SUBSCRIPTION_PLANS.free.scanLimit,
    };
    next();
  }
};

// Main route handler
router.post(
  "/",
  authenticateToken,
  getGuestId,
  trackGuestScan,
  checkScanLimit,
  upload.single("file"),
  async (req, res) => {
    let historyEntry; // ✅ تعريف هنا لتفادي الخطأ

    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ status: "error", message: "No file uploaded" });
      }

      const userId = req.isGuest ? req.guestId : req.user.id.toString();
      const userFolderPath = path.join(__dirname, "../uploads", userId);

      // ✅ استخدم fs.mkdir بدلاً من mkdirp
      await fs.mkdir(userFolderPath, { recursive: true });

      const timestamp = Date.now();
      const fileExtension = path.extname(req.file.originalname);
      const fileNameWithoutExt = path.basename(
        req.file.originalname,
        fileExtension
      );
      const newFileName = `${fileNameWithoutExt}-${timestamp}${fileExtension}`;
      const filePath = path.join(userFolderPath, newFileName);

      await fs.rename(req.file.path, filePath);

      const relativePath = `/uploads/${userId}/${newFileName}`;
      const baseUrl =
        process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
      const imageUrl = `${baseUrl}${relativePath}`;

      // Prepare and send to Python API
      const fileBuffer = await fs.readFile(filePath);
      const formData = new FormData();
      formData.append("file", fileBuffer, {
        filename: newFileName,
        contentType: req.file.mimetype,
      });

      const useAdvancedAnalytics =
        !req.isGuest && req.subscriptionInfo?.hasAdvancedAnalytics;
      const useGemini = req.query.use_gemini === "true" || useAdvancedAnalytics;
      const generateReport =
        req.query.generate_report === "true" || useAdvancedAnalytics;

      const pythonResponse = await axios.post(
        `${PYTHON_API_URL}/classify?use_gemini=${useGemini}&generate_report=${generateReport}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            "X-API-KEY": req.headers["x-api-key"],
          },
        }
      );

      // Save history
      historyEntry = new History({
        userId: req.isGuest ? null : req.user.id,
        guestId: req.isGuest ? req.guestId : null,
        imageUrl,
        filename: newFileName,
        classification: pythonResponse.data,
        timestamp: new Date(),
      });
      await historyEntry.save();

      // Prepare response
      const scansMadeToday = req.isGuest
        ? (await GuestUser.findOne({ guestId: req.guestId }))?.scanCount || 0
        : await countDailyScans(req.user.id);
      const response = {
        ...pythonResponse.data,
        processed_by: "Node Server",
        processing_time: new Date().toLocaleString("en-US"),
        imageUrl,
        imageUrlNodeServer: relativePath,
        historyId: historyEntry._id,
        ...(req.isGuest
          ? {
              guest_info: {
                scans_used: scansMadeToday,
                scans_remaining: Math.max(0, MAX_GUEST_SCANS - scansMadeToday),
                scan_limit: MAX_GUEST_SCANS,
              },
            }
          : {
              subscription_info: {
                ...req.subscriptionInfo,
                scans_used: scansMadeToday,
                scans_remaining: Math.max(
                  0,
                  req.subscriptionInfo.scanLimit - scansMadeToday
                ),
              },
            }),
      };

      res.json(response);
    } catch (error) {
      console.error("Error classifying image:", error);
      await cleanupOnError(req.file?.path, historyEntry?._id);
      res.status(error.response?.status || 500).json({
        status: "error",
        message: error.response?.data?.detail || "Failed to classify image",
        error: error.message,
      });
    }
  }
);

// Stats route
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }

    const { plan, scanLimit } = await getUserSubscriptionInfo(user._id);
    const scansMadeToday = await countDailyScans(user._id);

    res.json({
      status: "success",
      subscription_info: {
        plan,
        scan_limit: scanLimit,
        scans_used: scansMadeToday,
        scans_remaining: Math.max(0, scanLimit - scansMadeToday),
      },
    });
  } catch (error) {
    console.error("Error fetching scan stats:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch scan stats" });
  }
});

// Cleanup function
const cleanupOnError = async (filePath, historyId) => {
  try {
    if (
      filePath &&
      (await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false))
    ) {
      await fs.unlink(filePath);
    }
    if (historyId) {
      await History.findByIdAndDelete(historyId);
    }
  } catch (cleanupError) {
    console.error("Cleanup error:", cleanupError);
  }
};

module.exports = router;
