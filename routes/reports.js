const express = require("express");
const PDFDocument = require("pdfkit");
const axios = require("axios");
const { SUBSCRIPTION_PLANS } = require("../config/config");
const authenticateToken = require("../middleware/auth");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const History = require("../models/History");

const router = express.Router();

// Middleware to check subscription for report access
const checkReportAccess = async (req, res, next) => {
  try {
    if (req.isGuest) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required to access reports",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    const subscription = await Subscription.findOne({
      userId: user._id,
      status: "active",
      endDate: { $gt: new Date() },
    });

    let hasAdvancedAnalytics = false;
    let plan = "free";

    if (subscription) {
      plan = subscription.plan;
      hasAdvancedAnalytics =
        SUBSCRIPTION_PLANS[plan]?.advancedAnalytics || false;
    }

    if (!hasAdvancedAnalytics) {
      return res.status(403).json({
        status: "error",
        message:
          "Reports are only available with premium subscriptions. Please upgrade your plan.",
        subscription_info: {
          plan,
          has_advanced_analytics: hasAdvancedAnalytics,
        },
      });
    }

    req.subscriptionInfo = {
      plan,
      hasAdvancedAnalytics,
      scanLimit: SUBSCRIPTION_PLANS[plan]?.scanLimit || 0,
      prioritySupport: SUBSCRIPTION_PLANS[plan]?.prioritySupport || false,
      apiAccess: SUBSCRIPTION_PLANS[plan]?.apiAccess || false,
    };
    next();
  } catch (error) {
    console.error("Error in checkReportAccess:", error.message);
    return res.status(500).json({
      status: "error",
      message: "Failed to verify subscription status",
      error: error.message,
    });
  }
};

// Helper function to add wrapped text with truncation and return the new y position
const addWrappedText = (doc, text, maxLines = 2, options = {}) => {
  const defaultOptions = {
    width: doc.page.width - 100,
    align: "left",
    x: 50,
  };
  const mergedOptions = { ...defaultOptions, ...options };

  const lines = text.split("\n").slice(0, maxLines);
  let truncatedText = lines.join("\n");
  if (text.split("\n").length > maxLines) {
    truncatedText += "...";
  }

  const lineHeight = 18;
  const textHeight = lines.length * lineHeight;

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .text(truncatedText, mergedOptions.x, doc.y, {
      width: mergedOptions.width,
      align: mergedOptions.align,
    });

  return doc.y + 5;
};

// Endpoint to generate a single-page styled report
router.get(
  "/generate/:historyId", // Updated path
  authenticateToken,
  checkReportAccess,
  async (req, res) => {
    const { historyId } = req.params;

    try {
      const historyItem = await History.findById(historyId);
      if (!historyItem) {
        console.error(`History item not found for ID: ${historyId}`);
        return res.status(404).json({
          status: "error",
          message: "Classification not found",
        });
      }

      if (historyItem.userId.toString() !== req.user.id) {
        console.error(
          `Unauthorized access attempt for historyId: ${historyId} by user: ${req.user.id}`
        );
        return res.status(403).json({
          status: "error",
          message: "Unauthorized to access this classification",
        });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        console.error(`User not found for ID: ${req.user.id}`);
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      const subscription = await Subscription.findOne({
        userId: user._id,
        status: "active",
        endDate: { $gt: new Date() },
      });
      let plan = "free";
      if (subscription) plan = subscription.plan;
      const planFeatures = SUBSCRIPTION_PLANS[plan] || SUBSCRIPTION_PLANS.free;

      let imageBuffer = null;
      if (historyItem.imageUrl) {
        try {
          const imageResponse = await axios.get(historyItem.imageUrl, {
            responseType: "arraybuffer",
            timeout: 5000,
          });
          imageBuffer = Buffer.from(imageResponse.data, "binary");
        } catch (imageError) {
          console.warn(
            `Failed to fetch image from ${historyItem.imageUrl}: ${imageError.message}`
          );
        }
      }

      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        autoFirstPage: false,
      });

      doc.addPage();

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=classification_report_${historyId}.pdf`
      );
      doc.pipe(res);

      doc
        .lineWidth(1)
        .strokeColor("#e2e8f0")
        .rect(30, 30, doc.page.width - 60, doc.page.height - 60)
        .stroke();

      let yPos = 50;

      doc
        .fillColor("#2d3748")
        .font("Helvetica-Bold")
        .fontSize(24)
        .text("Pestector Plant Report", 50, yPos, { align: "center" });

      yPos = 80;
      doc
        .fillColor("#4a5568")
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(`Generated: ${new Date().toLocaleString()}`, 50, yPos, {
          align: "center",
        });

      yPos = 110;
      doc
        .fillColor("#1a202c")
        .font("Helvetica-Bold")
        .fontSize(18)
        .text("Info", 50, yPos, { underline: true });

      yPos = 135;
      doc
        .fillColor("#4a5568")
        .font("Helvetica")
        .fontSize(14)
        .text(`PhoneNumber: ${user.phoneNumber || "N/A"}`, 50, yPos);

      yPos += 20;
      doc.text(`Username: ${user.username || "N/A"}`, 50, yPos);

      yPos += 20;
      doc.text(`Email: ${user.email || "N/A"}`, 50, yPos);

      yPos += 20;
      doc.text(`ID: ${historyId || "N/A"}`, 50, yPos);

      yPos += 20;
      doc.text(`© 2025 Pestector`, 50, yPos);

      yPos += 30;
      doc
        .fillColor("#1a202c")
        .font("Helvetica-Bold")
        .fontSize(18)
        .text("Subscription", 50, yPos, { underline: true });

      yPos += 25;
      doc
        .fillColor("#4a5568")
        .font("Helvetica")
        .fontSize(14)
        .text(
          `Plan: ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
          50,
          yPos
        );

      yPos += 20;
      doc.text(`Scans: ${planFeatures.scanLimit}`, 50, yPos);

      yPos += 30;

      if (imageBuffer) {
        doc
          .fillColor("#1a202c")
          .font("Helvetica-Bold")
          .fontSize(18)
          .text("Plant Image", 50, yPos, { underline: true });

        doc
          .fillColor("#1a202c")
          .font("Helvetica-Bold")
          .fontSize(18)
          .text("Classification", 300, yPos, { underline: true });

        yPos += 25;

        doc.image(imageBuffer, 50, yPos, { fit: [100, 100], align: "left" });

        doc
          .fillColor("#4a5568")
          .font("Helvetica")
          .fontSize(14)
          .text(
            `Plant: ${historyItem.classification.prediction.plant}`,
            300,
            yPos,
            { continued: true }
          )
          .fillColor("#2b6cb0")
          .text(
            ` (${Math.round(
              historyItem.classification.prediction.confidence
            )}%)`
          );

        yPos += 20;
        doc
          .fillColor("#4a5568")
          .font("Helvetica")
          .fontSize(14)
          .text(
            `Condition: ${historyItem.classification.prediction.condition}`,
            300,
            yPos
          );

        yPos += 20;
        doc.text(
          `Severity: ${historyItem.classification.prediction.disease_info.severity}`,
          300,
          yPos
        );

        yPos += 80;
      } else {
        doc
          .fillColor("#1a202c")
          .font("Helvetica-Bold")
          .fontSize(18)
          .text("Classification", 50, yPos, { underline: true });

        yPos += 25;
        doc
          .fillColor("#4a5568")
          .font("Helvetica")
          .fontSize(14)
          .text(
            `Plant: ${historyItem.classification.prediction.plant}`,
            50,
            yPos,
            { continued: true }
          )
          .fillColor("#2b6cb0")
          .text(
            ` (${Math.round(
              historyItem.classification.prediction.confidence
            )}%)`
          );

        yPos += 20;
        doc
          .fillColor("#4a5568")
          .font("Helvetica")
          .fontSize(14)
          .text(
            `Condition: ${historyItem.classification.prediction.condition}`,
            50,
            yPos
          );

        yPos += 20;
        doc.text(
          `Severity: ${historyItem.classification.prediction.disease_info.severity}`,
          50,
          yPos
        );

        yPos += 30;
      }

      const remainingSpace = doc.page.height - 80 - yPos;
      const neededSpace = 150;

      let maxDescriptionLines = 4;
      let maxTreatmentLines = 4;

      if (remainingSpace < neededSpace) {
        maxDescriptionLines = 2;
        maxTreatmentLines = 2;
      }

      doc
        .fillColor("#1a202c")
        .font("Helvetica-Bold")
        .fontSize(18)
        .text("Description", 50, yPos, { underline: true });

      yPos += 25;
      const description =
        historyItem.classification.prediction.disease_info.descriptions[0] ||
        "No description available";

      const descriptionLines = description.split("\n");
      let truncatedDescription = descriptionLines
        .slice(0, maxDescriptionLines)
        .join("\n");
      if (descriptionLines.length > maxDescriptionLines) {
        truncatedDescription += "...";
      }

      doc
        .fillColor("#4a5568")
        .font("Helvetica")
        .fontSize(14)
        .text(truncatedDescription, 50, yPos, { width: doc.page.width - 100 });

      yPos = doc.y + 20;

      doc
        .fillColor("#1a202c")
        .font("Helvetica-Bold")
        .fontSize(18)
        .text("Treatment", 50, yPos, { underline: true });

      yPos += 25;
      const treatment =
        historyItem.classification.prediction.treatment_recommendations ||
        "No recommendations available";

      const treatmentLines = treatment.split("\n");
      let truncatedTreatment = treatmentLines
        .slice(0, maxTreatmentLines)
        .join("\n");
      if (treatmentLines.length > maxTreatmentLines) {
        truncatedTreatment += "...";
      }

      doc
        .fillColor("#4a5568")
        .font("Helvetica")
        .fontSize(14)
        .text(truncatedTreatment, 50, yPos, { width: doc.page.width - 100 });

      doc.end();
    } catch (error) {
      console.error("Error generating report:", error.message, error.stack);
      if (!res.headersSent) {
        res.status(500).json({
          status: "error",
          message: "Failed to generate report",
          error: error.message,
        });
      }
    }
  }
);

// Access check endpoint (unchanged)
router.get("/access/check", authenticateToken, async (req, res) => {
  try {
    if (req.isGuest) {
      return res.status(200).json({
        status: "success",
        has_access: false,
        message: "Authentication required to access reports",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    const subscription = await Subscription.findOne({
      userId: user._id,
      status: "active",
      endDate: { $gt: new Date() },
    });

    let plan = "free";
    if (subscription) plan = subscription.plan;

    const planFeatures = SUBSCRIPTION_PLANS[plan] || SUBSCRIPTION_PLANS.free;
    const hasAdvancedAnalytics = planFeatures.advancedAnalytics || false;

    const eligiblePlans = Object.entries(SUBSCRIPTION_PLANS)
      .filter(([_, features]) => features.advancedAnalytics)
      .map(([planName]) => planName);

    return res.status(200).json({
      status: "success",
      has_access: hasAdvancedAnalytics,
      subscription_info: {
        plan,
        has_advanced_analytics: hasAdvancedAnalytics,
        scan_limit: planFeatures.scanLimit,
        priority_support: planFeatures.prioritySupport,
        api_access: planFeatures.apiAccess,
      },
      eligible_plans: eligiblePlans,
      message: hasAdvancedAnalytics
        ? "User has access to reports"
        : `Reports are only available with ${eligiblePlans.join(
            ", "
          )} subscriptions. Please upgrade your plan.`,
    });
  } catch (error) {
    console.error("Error checking report access:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to verify subscription status",
      error: error.message,
    });
  }
});

module.exports = router;
