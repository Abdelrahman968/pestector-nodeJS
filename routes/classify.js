// classify.js
require("dotenv").config(); // Ensure .env variables are loaded
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const axios = require("axios");
const FormData = require("form-data");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const TreatmentPlan = require("../models/TreatmentPlan");
const {
  PYTHON_API_URL,
  MAX_GUEST_SCANS,
  SUBSCRIPTION_PLANS, // Make sure this is correctly defined and exported from config.js
} = require("../config/config");
const authenticateToken = require("../middleware/auth");
const { getGuestId, trackGuestScan } = require("../middleware/guest");
const History = require("../models/History");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const GuestUser = require("../models/GuestUser");
const Analytics = require("../models/Analytics");
const NodeCache = require("node-cache");
const crypto = require("crypto");

const router = express.Router();
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 }); // 1-hour TTL for classify

// Log SUBSCRIPTION_PLANS at the top level to ensure it's loaded correctly
// console.log(
//   "[Classify.js Top Level] Loaded SUBSCRIPTION_PLANS:",
//   JSON.stringify(SUBSCRIPTION_PLANS, null, 2)
// );

// Multer Configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const validMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    const mimeType = file.mimetype || "image/jpeg"; // Fallback for blobs
    const extension = path.extname(file.originalname || "").toLowerCase();

    // console.log("File received:", {
    //   originalname: file.originalname,
    //   mimetype: file.mimetype,
    //   size: file.size,
    // });

    if (
      validMimeTypes.includes(mimeType) ||
      [".jpg", ".jpeg", ".png", ".webp"].includes(extension)
    ) {
      cb(null, true);
    } else {
      console.error("Invalid file type:", file.mimetype, file.originalname);
      cb(new Error("Only image files (JPEG, PNG, WebP) are allowed"), false);
    }
  },
});

// Utility Functions
const getTodayStart = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const getUserSubscriptionInfo = async (userId) => {
  // console.log(
  //   `[getUserSubscriptionInfo] Attempting to fetch subscription for userId: ${userId} (Type: ${typeof userId})`
  // );
  // console.log(
  //   `[getUserSubscriptionInfo] Current server date for endDate check: ${new Date().toISOString()}`
  // );

  let subscriptionDoc;
  try {
    subscriptionDoc = await Subscription.findOne({
      userId: userId,
      status: "active",
      endDate: { $gt: new Date() },
    })
      .sort({ startDate: -1 })
      .lean();

    // console.log(
    //   `[getUserSubscriptionInfo] Raw subscriptionDoc from DB query:`,
    //   JSON.stringify(subscriptionDoc, null, 2)
    // );

    if (!subscriptionDoc) {
      // console.log(
      //   `[getUserSubscriptionInfo] No active/valid subscription found in DB. Defaulting to 'free' plan.`
      // );
      return {
        plan: "free",
        scanLimit: SUBSCRIPTION_PLANS.free.features.scanLimit,
        hasAdvancedAnalytics:
          SUBSCRIPTION_PLANS.free.features.advancedAnalytics ?? false,
      };
    }

    const planNameFromDb = subscriptionDoc.plan;
    // console.log(
    //   `[getUserSubscriptionInfo] Found plan in DB: '${planNameFromDb}'`
    // );

    const planConfig = SUBSCRIPTION_PLANS[planNameFromDb];
    if (!planConfig || !planConfig.features) {
      // console.warn(
      //   `[getUserSubscriptionInfo] Plan '${planNameFromDb}' (from DB) not fully defined in SUBSCRIPTION_PLANS or its features are missing. Configured plans: ${Object.keys(
      //     SUBSCRIPTION_PLANS
      //   ).join(", ")}. Using DB plan name but free plan features as fallback.`
      // );
      // console.log(
      //   `[getUserSubscriptionInfo] Problematic subscriptionDoc:`,
      //   JSON.stringify(subscriptionDoc, null, 2)
      // );
      // console.log(
      //   `[getUserSubscriptionInfo] SUBSCRIPTION_PLANS config:`,
      //   JSON.stringify(SUBSCRIPTION_PLANS, null, 2)
      // );
      return {
        plan: planNameFromDb,
        scanLimit: SUBSCRIPTION_PLANS.free.features.scanLimit,
        hasAdvancedAnalytics:
          SUBSCRIPTION_PLANS.free.features.advancedAnalytics ?? false,
      };
    }

    const featuresFromDb = subscriptionDoc.features;
    const featuresFromConfig = planConfig.features;

    // console.log(
    //   `[getUserSubscriptionInfo] Features from DB subscriptionDoc.features:`,
    //   JSON.stringify(featuresFromDb, null, 2)
    // );
    // console.log(
    //   `[getUserSubscriptionInfo] Features from SUBSCRIPTION_PLANS['${planNameFromDb}'].features:`,
    //   JSON.stringify(featuresFromConfig, null, 2)
    // );

    const result = {
      plan: planNameFromDb,
      scanLimit:
        featuresFromDb?.scanLimit ??
        featuresFromConfig?.scanLimit ??
        SUBSCRIPTION_PLANS.free.features.scanLimit,
      hasAdvancedAnalytics:
        featuresFromDb?.advancedAnalytics ??
        featuresFromConfig?.advancedAnalytics ??
        SUBSCRIPTION_PLANS.free.features.advancedAnalytics ??
        false,
    };
    // console.log(
    //   `[getUserSubscriptionInfo] Successfully determined subscription info:`,
    //   JSON.stringify(result, null, 2)
    // );
    return result;
  } catch (error) {
    console.error(
      `[getUserSubscriptionInfo] Error during subscription fetch or processing:`,
      error
    );
    // console.log(
    //   `[getUserSubscriptionInfo] Falling back to 'free' plan due to error.`
    // );
    return {
      plan: "free",
      scanLimit: SUBSCRIPTION_PLANS.free.features.scanLimit,
      hasAdvancedAnalytics:
        SUBSCRIPTION_PLANS.free.features.advancedAnalytics ?? false,
    };
  }
};

const countDailyScans = async (userId) => {
  return History.countDocuments({
    userId,
    timestamp: { $gte: getTodayStart() },
  });
};

// Image Preprocessing Validation
const validateImage = async (buffer) => {
  try {
    const metadata = await sharp(buffer).metadata();
    if (metadata.width < 64 || metadata.height < 64) {
      throw new Error("Image dimensions too small (minimum 64x64)");
    }
    if (!["jpeg", "png", "webp"].includes(metadata.format)) {
      throw new Error("Unsupported image format (use JPEG, PNG, or WebP)");
    }
    return true;
  } catch (error) {
    throw new Error(`Image validation failed: ${error.message}`);
  }
};

// Middleware: Validate Query Parameters for /classify
const validateQueryParams = (req, res, next) => {
  const {
    model_choice = "best",
    use_gemini = "false",
    low_confidence_threshold = "0.7",
  } = req.query;

  if (!["vit", "vgg", "best"].includes(model_choice)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid model_choice. Must be 'vit', 'vgg', or 'best'.",
    });
  }

  if (!["true", "false"].includes(use_gemini.toString())) {
    return res.status(400).json({
      status: "error",
      message: "Invalid use_gemini. Must be 'true' or 'false'.",
    });
  }

  const threshold = parseFloat(low_confidence_threshold);
  if (isNaN(threshold) || threshold < 0 || threshold > 1) {
    return res.status(400).json({
      status: "error",
      message: "Invalid low_confidence_threshold. Must be between 0 and 1.",
    });
  }

  req.validatedQuery = {
    model_choice,
    use_gemini: use_gemini === "true",
    low_confidence_threshold: threshold,
  };
  next();
};

// Middleware: Check Scan Limit
const checkScanLimit = async (req, res, next) => {
  try {
    if (req.isGuest) {
      const guest = await GuestUser.findOne({ guestId: req.guestId });
      const scansUsed = guest?.scanCount || 0;
      if (scansUsed >= MAX_GUEST_SCANS) {
        // console.log(
        //   `[checkScanLimit] Guest scan limit reached for guestId: ${req.guestId}. Scans used: ${scansUsed}, Limit: ${MAX_GUEST_SCANS}`
        // );
        return res.status(403).json({
          status: "error",
          message: "Guest scan limit reached",
          guest_info: {
            scan_limit: MAX_GUEST_SCANS,
            scans_used: scansUsed,
            scans_remaining: 0,
          },
        });
      }
      req.subscriptionInfo = {
        plan: "guest",
        scan_limit: MAX_GUEST_SCANS,
        scans_used: scansUsed,
        scans_remaining: MAX_GUEST_SCANS - scansUsed,
        has_advanced_analytics: false,
      };
      // console.log(
      //   `[checkScanLimit] Guest ${
      //     req.guestId
      //   } proceeding. Scans used: ${scansUsed}, Remaining: ${
      //     MAX_GUEST_SCANS - scansUsed
      //   }`
      // );
      return next();
    }

    // For registered users
    // console.log(
    //   `[checkScanLimit] Authenticated user req.user.id: ${
    //     req.user.id
    //   } (Type: ${typeof req.user.id}), isAdmin: ${req.user.isAdmin}`
    // );

    const user = await User.findById(req.user.id);
    if (!user) {
      console.error(
        `[checkScanLimit] User not found in DB for id: ${req.user.id}`
      );
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }
    // console.log(
    //   `[checkScanLimit] User's cached subscription (user.subscription):`,
    //   JSON.stringify(user.subscription, null, 2)
    // );

    const { plan, scanLimit, hasAdvancedAnalytics } =
      await getUserSubscriptionInfo(user._id);

    // console.log(
    //   `[checkScanLimit] Info from getUserSubscriptionInfo: plan='${plan}', scanLimit=${scanLimit}, hasAdvancedAnalytics=${hasAdvancedAnalytics}`
    // );

    const scansUsed = await countDailyScans(user._id);
    // console.log(
    //   `[checkScanLimit] Scans used today for user ${user._id}: ${scansUsed}`
    // );

    if (scansUsed >= scanLimit) {
      // console.log(
      //   `[checkScanLimit] Daily scan limit reached for user ${user._id}. Scans used: ${scansUsed}, Limit for plan '${plan}': ${scanLimit}`
      // );
      return res.status(403).json({
        status: "error",
        message: "Daily scan limit reached",
        subscription_info: {
          plan,
          scan_limit: scanLimit,
          scans_used: scansUsed,
          scans_remaining: Math.max(0, scanLimit - scansUsed),
          has_advanced_analytics: hasAdvancedAnalytics,
        },
      });
    }

    req.subscriptionInfo = {
      plan,
      scan_limit: scanLimit,
      scans_used: scansUsed,
      scans_remaining: scanLimit - scansUsed,
      has_advanced_analytics: hasAdvancedAnalytics,
    };
    // console.log(
    //   `[checkScanLimit] User ${
    //     user._id
    //   } (Plan: ${plan}) proceeding. Scans used today: ${scansUsed}, Remaining: ${
    //     scanLimit - scansUsed
    //   }`
    // );
    next();
  } catch (error) {
    console.error("[checkScanLimit] Error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to verify scan limit",
    });
  }
};

// Main Classification Route
router.post(
  "/",
  authenticateToken,
  getGuestId,
  trackGuestScan, // This will run *after* checkScanLimit if placed here and checkScanLimit calls next().
  // If trackGuestScan should increment *before* limit check for guests, it should be earlier or integrated.
  // Current placement is fine: guest limit is checked, then if allowed, scan is tracked.
  validateQueryParams,
  checkScanLimit, // This is where the limit check happens.
  upload.single("file"),
  async (req, res) => {
    let historyEntry = null;
    let treatmentPlan = null;
    let analyticsEntry = null;

    try {
      // console.log(
      //   `[POST /classify] Request received. User type: ${
      //     req.isGuest ? "Guest" : "Registered"
      //   }, User/Guest ID: ${req.isGuest ? req.guestId : req.user.id}`
      // );
      const { plantId } = req.body;

      if (!req.file) {
        console.error("[POST /classify] No file uploaded.");
        return res
          .status(400)
          .json({ status: "error", message: "No file uploaded" });
      }

      await validateImage(req.file.buffer);
      // console.log("[POST /classify] Image validated.");

      const userIdForPath = req.isGuest ? req.guestId : req.user.id.toString();
      const timestamp = Date.now();
      const fileExtension = path.extname(req.file.originalname || ".jpg");
      const fileNameWithoutExt = path.basename(
        req.file.originalname || "upload",
        fileExtension
      );
      const uniqueId = uuidv4().split("-")[0];
      const newFileName = `${fileNameWithoutExt}-${timestamp}-${uniqueId}${fileExtension}`;

      const relativePath = `/Uploads/${userIdForPath}/${newFileName}`;
      const baseUrl =
        process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
      const imageUrl = `${baseUrl}${relativePath}`;

      const cacheKey = crypto
        .createHash("md5")
        .update(req.file.buffer)
        .digest("hex");

      const cachedResponse = cache.get(cacheKey);
      let pythonResponse;
      if (cachedResponse) {
        // console.log(`[POST /classify] Cache hit for image: ${cacheKey}`);
        pythonResponse = { data: cachedResponse };
      } else {
        // console.log(
        //   `[POST /classify] Cache miss for image: ${cacheKey}. Calling Python API.`
        // );
        const formData = new FormData();
        formData.append("file", req.file.buffer, {
          filename: newFileName,
          contentType: req.file.mimetype,
        });

        const useAdvancedAnalytics =
          !req.isGuest && req.subscriptionInfo?.has_advanced_analytics;
        const useGemini = req.validatedQuery.use_gemini || useAdvancedAnalytics;
        const modelChoice = req.validatedQuery.model_choice;

        const apiKey = req.headers["x-api-key"];
        if (!apiKey) {
          console.error("[POST /classify] Missing X-API-KEY header.");
          throw new Error("Missing X-API-KEY header");
        }
        // console.log(
        //   `[POST /classify] Calling Python API with model_choice: ${modelChoice}, use_gemini: ${useGemini}, useAdvancedAnalytics: ${useAdvancedAnalytics}`
        // );

        pythonResponse = await axios.post(
          `${PYTHON_API_URL}/classify?model_choice=${modelChoice}&use_gemini=${useGemini}`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              "X-API-KEY": apiKey,
            },
            timeout: 30000, // 30 seconds
          }
        );
        // console.log("[POST /classify] Python API response received.");
        cache.set(cacheKey, pythonResponse.data);
        // console.log(`[POST /classify] Cached response for image: ${cacheKey}`);
      }

      const userFolderPath = path.join(__dirname, "../Uploads", userIdForPath);
      await fs.mkdir(userFolderPath, { recursive: true });
      const filePath = path.join(userFolderPath, newFileName);
      await fs.writeFile(filePath, req.file.buffer);
      // console.log(`[POST /classify] File saved: ${filePath}`);

      historyEntry = new History({
        userId: req.isGuest ? null : req.user.id,
        guestId: req.isGuest ? req.guestId : null,
        plantId: plantId || null,
        imageUrl,
        filename: newFileName,
        classification: pythonResponse.data,
        timestamp: new Date(),
      });
      await historyEntry.save();
      // console.log(`[POST /classify] History entry saved: ${historyEntry._id}`);

      const { overall_best_prediction } = pythonResponse.data;
      let treatmentPlanId = null;
      let treatmentPlanWarning = null;

      if (overall_best_prediction.condition.toLowerCase() !== "healthy") {
        // console.log(
        //   `[POST /classify] Disease detected: ${overall_best_prediction.condition}. Attempting to create/find treatment plan.`
        // );
        try {
          const recentPlan = await TreatmentPlan.findOne({
            userId: req.isGuest ? null : req.user.id,
            guestId: req.isGuest ? req.guestId : null,
            plantName: overall_best_prediction.plant,
            disease: overall_best_prediction.condition,
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          });

          if (recentPlan) {
            treatmentPlanId = recentPlan._id;
            // console.log(
            //   `[POST /classify] Existing treatment plan found: ${treatmentPlanId}`
            // );
          } else {
            treatmentPlan = new TreatmentPlan({
              userId: req.isGuest ? null : req.user.id,
              guestId: req.isGuest ? req.guestId : null,
              plantName: overall_best_prediction.plant,
              disease: overall_best_prediction.condition,
              treatment:
                overall_best_prediction.treatment_recommendations ||
                "No treatment data available",
              status: "pending",
            });
            await treatmentPlan.save();
            treatmentPlanId = treatmentPlan._id;
            // console.log(
            //   `[POST /classify] New treatment plan created: ${treatmentPlanId}`
            // );
          }
        } catch (error) {
          console.error(
            "[POST /classify] Error creating treatment plan:",
            error
          );
          treatmentPlanWarning = {
            type: "treatment_plan_failed",
            message: `Failed to create treatment plan: ${error.message}`,
          };
        }
      }

      analyticsEntry = new Analytics({
        userId: req.isGuest ? null : req.user.id,
        guestId: req.isGuest ? req.guestId : null,
        classification: {
          plant: overall_best_prediction.plant,
          condition: overall_best_prediction.condition,
          confidence: overall_best_prediction.confidence,
          model_source:
            overall_best_prediction.data_source === "Gemini"
              ? "Gemini"
              : overall_best_prediction.model_source,
        },
        processing_time_seconds: pythonResponse.data.processing_time_seconds,
        timestamp: new Date(),
      });
      await analyticsEntry.save();
      // console.log(
      //   `[POST /classify] Analytics entry saved: ${analyticsEntry._id}`
      // );

      // req.subscriptionInfo should be populated by checkScanLimit
      // For guests, trackGuestScan updates the GuestUser.scanCount, which is then read here.
      // For users, countDailyScans is called again to get the most up-to-date count for the response.
      let scansMadeToday, totalScansForGuest;
      if (req.isGuest) {
        const guestUserAfterScan = await GuestUser.findOne({
          guestId: req.guestId,
        });
        totalScansForGuest =
          guestUserAfterScan?.scanCount || req.subscriptionInfo.scans_used + 1; // Best guess if somehow null
      } else {
        scansMadeToday = await countDailyScans(req.user.id); // Reflects count *after* this scan
      }

      const response = {
        status: "success",
        overall_best_prediction: {
          plant: overall_best_prediction.plant,
          condition: overall_best_prediction.condition,
          confidence: overall_best_prediction.confidence,
          confidence_percent: overall_best_prediction.confidence_percent,
          model_source: overall_best_prediction.model_source,
          label: overall_best_prediction.label,
          disease_info: overall_best_prediction.disease_info,
          treatment_recommendations:
            overall_best_prediction.treatment_recommendations,
          reason_for_disease: overall_best_prediction.reason_for_disease,
          data_source: overall_best_prediction.data_source,
          gemini_highlighted:
            overall_best_prediction.gemini_highlighted || false,
        },
        vit_predictions: pythonResponse.data.vit_predictions,
        tf_predictions: pythonResponse.data.tf_predictions,
        metadata: {
          filename: pythonResponse.data.metadata.filename,
          content_type: pythonResponse.data.metadata.content_type,
          save_path: pythonResponse.data.metadata.save_path,
          timestamp: pythonResponse.data.metadata.timestamp,
          image_details: pythonResponse.data.metadata.image_details,
        },
        processing_time_seconds: pythonResponse.data.processing_time_seconds,
        model_choice_used: pythonResponse.data.model_choice_used,
        low_confidence_threshold:
          req.validatedQuery.low_confidence_threshold ||
          pythonResponse.data.low_confidence_threshold,
        history_id: historyEntry._id,
        treatment_plan_id: treatmentPlanId,
        warnings: [
          ...(overall_best_prediction.confidence <
          req.validatedQuery.low_confidence_threshold
            ? [
                {
                  type: "low_confidence",
                  message: `Confidence (${
                    overall_best_prediction.confidence_percent
                  }%) is below threshold (${
                    req.validatedQuery.low_confidence_threshold * 100
                  }%)`,
                },
              ]
            : []),
          ...(treatmentPlanWarning ? [treatmentPlanWarning] : []),
        ],
        subscription_info: req.isGuest
          ? {
              plan: "guest",
              scan_limit: MAX_GUEST_SCANS,
              scans_used: totalScansForGuest, // This is total count for guest
              scans_remaining: Math.max(
                0,
                MAX_GUEST_SCANS - totalScansForGuest
              ),
            }
          : {
              plan: req.subscriptionInfo.plan,
              scan_limit: req.subscriptionInfo.scan_limit,
              scans_used: scansMadeToday, // This is daily count for user
              scans_remaining: Math.max(
                0,
                req.subscriptionInfo.scan_limit - scansMadeToday
              ),
              has_advanced_analytics:
                req.subscriptionInfo.has_advanced_analytics,
            },
      };
      // console.log(
      //   "[POST /classify] Successfully processed request. Sending response."
      // );
      res.json(response);
    } catch (error) {
      console.error(
        "[POST /classify] Error classifying image:",
        error.message,
        error.stack
      );
      if (error.response) {
        // Axios error
        console.error(
          "[POST /classify] Python API Error Data:",
          error.response.data
        );
        console.error(
          "[POST /classify] Python API Error Status:",
          error.response.status
        );
      }

      if (historyEntry?._id) {
        await History.findByIdAndDelete(historyEntry._id).catch((err) =>
          console.error("History cleanup error:", err)
        );
      }
      if (treatmentPlan?._id) {
        await TreatmentPlan.findByIdAndDelete(treatmentPlan._id).catch((err) =>
          console.error("Treatment plan cleanup error:", err)
        );
      }
      if (analyticsEntry?._id) {
        await Analytics.findByIdAndDelete(analyticsEntry._id).catch((err) =>
          console.error("Analytics cleanup error:", err)
        );
      }

      let statusCode = 500;
      let message = "Failed to classify image";
      if (error.message.includes("Image validation failed")) {
        statusCode = 400;
        message = error.message;
      } else if (error.response) {
        // Python API error
        statusCode = error.response.status || 500;
        message =
          error.response.data?.detail ||
          error.response.data?.message ||
          "Error from classification service";
        if (statusCode === 415)
          message = "Unsupported file type. Please upload an image.";
        else if (statusCode === 403)
          message =
            "Invalid API key or access denied by classification service.";
      } else if (error.message.includes("timeout")) {
        statusCode = 504;
        message = "Classification request timed out.";
      } else if (error.message.includes("Missing X-API-KEY")) {
        statusCode = 401; // Or 400, depending on how you want to signal it
        message = error.message;
      }

      res.status(statusCode).json({
        status: "error",
        message,
        // error: process.env.NODE_ENV === 'development' ? error.message : undefined, // Only show full error in dev
      });
    }
  }
);

// Stats Endpoint
const statsCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

const validateStatsQueryParams = (req, res, next) => {
  const { dateStart, dateEnd, userType = "all", plan } = req.query;

  let startDate = dateStart
    ? new Date(dateStart)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  let endDate = dateEnd ? new Date(dateEnd) : new Date();

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return res.status(400).json({
      status: "error",
      message:
        "Invalid dateStart or dateEnd format. Use ISO 8601 (e.g., 2025-04-01).",
    });
  }
  if (startDate > endDate) {
    return res.status(400).json({
      status: "error",
      message: "dateStart cannot be later than dateEnd.",
    });
  }

  if (!["all", "guest", "user"].includes(userType)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid userType. Must be 'all', 'guest', or 'user'.",
    });
  }

  const validPlans = [...Object.keys(SUBSCRIPTION_PLANS), "guest"];
  if (plan && !validPlans.includes(plan)) {
    return res.status(400).json({
      status: "error",
      message: `Invalid plan. Must be one of ${validPlans.join(", ")}.`,
    });
  }

  if (!req.user?.isAdmin) {
    if (userType === "all" || plan) {
      return res.status(403).json({
        status: "error",
        message: "Only admins can filter by userType='all' or plan.",
      });
    }
  }

  req.statsQuery = {
    dateStart: startDate,
    dateEnd: endDate,
    userType,
    plan,
  };
  next();
};

const checkStatsAccess = async (req, res, next) => {
  try {
    if (req.isGuest) {
      req.statsScope = { guestId: req.guestId };
      return next();
    }

    // For registered users, ensure req.user is populated by authenticateToken
    if (!req.user || !req.user.id) {
      console.error("[checkStatsAccess] req.user not populated for non-guest.");
      return res
        .status(401)
        .json({ status: "error", message: "Authentication required." });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }

    req.user.isAdmin = user.role === "admin"; // Ensure isAdmin is fresh from DB

    if (user.isAdmin) {
      req.statsScope = {};
    } else {
      req.statsScope = { userId: req.user.id };
    }
    next();
  } catch (error) {
    console.error("Error in checkStatsAccess:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to verify stats access" });
  }
};

router.get(
  "/stats",
  authenticateToken,
  getGuestId, // For guest access to their own stats
  checkStatsAccess, // Sets req.statsScope based on admin/user/guest
  validateStatsQueryParams, // Validates query params and sets req.statsQuery
  async (req, res) => {
    try {
      const { dateStart, dateEnd, userType, plan: planFilter } = req.statsQuery; // Renamed plan to planFilter
      const { statsScope } = req; // { userId: ID } or { guestId: ID } or {} for admin

      const apiKey = req.headers["x-api-key"];
      if (!apiKey) {
        return res
          .status(401)
          .json({ status: "error", message: "Missing X-API-KEY header" });
      }

      const cacheKey = crypto
        .createHash("md5")
        .update(
          JSON.stringify({
            dateStart,
            dateEnd,
            userType,
            plan: planFilter,
            statsScope,
          })
        )
        .digest("hex");

      const cachedStats = statsCache.get(cacheKey);
      if (cachedStats) {
        // console.log(`[GET /stats] Cache hit for stats: ${cacheKey}`);
        return res.json(cachedStats);
      }
      // console.log(
      //   `[GET /stats] Cache miss for stats: ${cacheKey}. Querying DB.`
      // );
      // console.log(
      //   `[GET /stats] Filters: dateStart=${dateStart.toISOString()}, dateEnd=${dateEnd.toISOString()}, userType=${userType}, planFilter=${planFilter}, statsScope=${JSON.stringify(
      //     statsScope
      //   )}`
      // );

      let query = {
        timestamp: { $gte: dateStart, $lte: dateEnd },
        ...statsScope, // Apply {userId: X} or {guestId: Y} or {}
      };

      // If user.isAdmin is true and a specific userType is chosen, filter by that
      if (req.user?.isAdmin) {
        if (userType === "guest") {
          query.guestId = { $ne: null };
          delete query.userId; // Ensure we don't also filter by admin's own userId
        } else if (userType === "user") {
          query.userId = { $ne: null };
          delete query.guestId;
        }
        // if userType === 'all', statsScope (which is {} for admin) already allows all
      }
      // Non-admins are already scoped by statsScope to their own userId or guestId

      // Apply plan filter (only if admin and planFilter is provided)
      if (planFilter && req.user?.isAdmin) {
        if (planFilter === "guest") {
          query.guestId = { $ne: null };
          query.userId = null; // Explicitly only guests
        } else {
          // Find users who had this plan active at *any point* within the date range
          const usersInPlan = await Subscription.find({
            plan: planFilter,
            status: "active",
            $or: [
              // Subscription overlaps with the query period
              { startDate: { $lte: dateEnd }, endDate: { $gte: dateStart } },
            ],
          }).distinct("userId");
          query.userId = { $in: usersInPlan.map((id) => id) }; // Ensure it's an array of ObjectIds
          query.guestId = null; // Explicitly only subscribed users
        }
      }
      // console.log(
      //   `[GET /stats] Final MongoDB query for main analytics: ${JSON.stringify(
      //     query
      //   )}`
      // );

      const analyticsData = await Analytics.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              plant: "$classification.plant",
              condition: "$classification.condition",
              model_source: "$classification.model_source",
            },
            count: { $sum: 1 },
            avgConfidence: { $avg: "$classification.confidence" },
            avgProcessingTime: { $avg: "$processing_time_seconds" },
          },
        },
        { $sort: { count: -1 } },
      ]);

      const totalScans = await Analytics.countDocuments(query);

      let userScans = 0;
      let guestScans = 0;

      if (req.user?.isAdmin && userType === "all" && !planFilter) {
        // Admin, all users, no plan filter
        userScans = await Analytics.countDocuments({
          ...query,
          userId: { $ne: null },
          guestId: null,
        });
        guestScans = await Analytics.countDocuments({
          ...query,
          guestId: { $ne: null },
          userId: null,
        });
      } else if (req.user?.isAdmin && userType === "user") {
        userScans = totalScans; // query is already filtered for users
        guestScans = 0;
      } else if (req.user?.isAdmin && userType === "guest") {
        guestScans = totalScans; // query is already filtered for guests
        userScans = 0;
      } else if (statsScope.userId) {
        // Non-admin user
        userScans = totalScans;
        guestScans = 0;
      } else if (statsScope.guestId) {
        // Non-admin guest
        guestScans = totalScans;
        userScans = 0;
      }

      let scansByPlan = {};
      if (req.user?.isAdmin) {
        const planStatsPipelineBase = [
          // Match analytics entries within the date range
          { $match: { timestamp: { $gte: dateStart, $lte: dateEnd } } },
          // Lookup the subscription active at the time of each scan
          {
            $lookup: {
              from: "subscriptions", // The name of your subscriptions collection
              let: {
                userIdStr: { $toString: "$userId" },
                scanTime: "$timestamp",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$userId", { $toObjectId: "$$userIdStr" }] },
                        { $eq: ["$status", "active"] },
                        { $lte: ["$startDate", "$$scanTime"] },
                        { $gt: ["$endDate", "$$scanTime"] }, //endDate is exclusive if it means "valid until"
                      ],
                    },
                  },
                },
                { $sort: { startDate: -1 } }, // Pick the most recent if overlapping
                { $limit: 1 },
              ],
              as: "activeSubscription",
            },
          },
          // Group by plan or 'guest' or 'free' (if no active paid subscription)
          {
            $group: {
              _id: {
                $cond: {
                  if: { $ne: ["$guestId", null] }, // Is it a guest?
                  then: "guest",
                  else: {
                    // It's a registered user
                    $ifNull: [
                      // If they have an active sub, use its plan, else 'free'
                      { $arrayElemAt: ["$activeSubscription.plan", 0] },
                      "free", // Default for users without an active paid subscription
                    ],
                  },
                },
              },
              count: { $sum: 1 },
            },
          },
        ];

        // If admin is filtering by a specific user plan, apply that to the plan aggregation as well
        let planAggregationMatch = {
          timestamp: { $gte: dateStart, $lte: dateEnd },
        };
        if (planFilter && planFilter !== "guest") {
          const usersInPlanForAgg = await Subscription.find({
            plan: planFilter,
            status: "active",
            $or: [
              { startDate: { $lte: dateEnd }, endDate: { $gte: dateStart } },
            ],
          }).distinct("userId");
          planAggregationMatch.userId = {
            $in: usersInPlanForAgg.map((id) => id),
          };
        } else if (planFilter === "guest") {
          planAggregationMatch.guestId = { $ne: null };
          planAggregationMatch.userId = null;
        }
        // If userType filter is applied, also respect it for scansByPlan calculation
        if (userType === "user") {
          planAggregationMatch.userId = { $ne: null };
          planAggregationMatch.guestId = null;
        } else if (userType === "guest") {
          planAggregationMatch.guestId = { $ne: null };
          planAggregationMatch.userId = null;
        }

        const planStats = await Analytics.aggregate([
          { $match: planAggregationMatch },
          ...planStatsPipelineBase.slice(1), // remove the base timestamp match, use planAggregationMatch
        ]);

        scansByPlan = Object.keys(SUBSCRIPTION_PLANS).reduce((acc, p) => {
          acc[p] = 0;
          return acc;
        }, {});
        scansByPlan.guest = 0; // Initialize guest count

        planStats.forEach((item) => {
          if (item._id && scansByPlan.hasOwnProperty(item._id)) {
            scansByPlan[item._id] += item.count;
          } else if (item._id) {
            // Plan might not be in SUBSCRIPTION_PLANS (e.g. old plan)
            scansByPlan[item._id] = item.count;
          }
        });
      }

      const stats = {
        status: "success",
        date_range: {
          start: dateStart.toISOString(),
          end: endDate.toISOString(),
        },
        total_scans: totalScans,
        scans_by_user_type: { users: userScans, guests: guestScans },
        scans_by_plan: req.user?.isAdmin ? scansByPlan : undefined,
        scans_by_plant: analyticsData.reduce((acc, item) => {
          acc[item._id.plant] = (acc[item._id.plant] || 0) + item.count;
          return acc;
        }, {}),
        scans_by_condition: analyticsData.reduce((acc, item) => {
          acc[item._id.condition] = (acc[item._id.condition] || 0) + item.count;
          return acc;
        }, {}),
        scans_by_model: analyticsData.reduce((acc, item) => {
          acc[item._id.model_source] =
            (acc[item._id.model_source] || 0) + item.count;
          return acc;
        }, {}),
        average_confidence: analyticsData.length
          ? Number(
              (
                analyticsData.reduce(
                  (sum, item) => sum + item.avgConfidence,
                  0
                ) / analyticsData.length
              ).toFixed(3)
            )
          : 0,
        average_processing_time: analyticsData.length
          ? Number(
              (
                analyticsData.reduce(
                  (sum, item) => sum + item.avgProcessingTime,
                  0
                ) / analyticsData.length
              ).toFixed(3)
            )
          : 0,
        top_plants: Object.entries(
          analyticsData.reduce((acc, item) => {
            acc[item._id.plant] = (acc[item._id.plant] || 0) + item.count;
            return acc;
          }, {})
        )
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([plant, count]) => ({ plant, count })),
        top_conditions: Object.entries(
          analyticsData.reduce((acc, item) => {
            acc[item._id.condition] =
              (acc[item._id.condition] || 0) + item.count;
            return acc;
          }, {})
        )
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([condition, count]) => ({ condition, count })),
      };

      statsCache.set(cacheKey, stats);
      // console.log(
      //   `[GET /stats] Stats computed and cached for key: ${cacheKey}`
      // );
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch statistics",
        error: error.message,
      });
    }
  }
);

module.exports = router;
