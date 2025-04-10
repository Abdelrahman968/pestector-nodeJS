const express = require("express");

const authRoutes = require("./auth");
const historyRoutes = require("./history");
const chatRoutes = require("./chat");
const weatherRoutes = require("./weather");
const forumRoutes = require("./forum");
const plantsRoutes = require("./plants");
const remindersRoutes = require("./reminders");
const feedbackRoutes = require("./feedback");
const analyticsRoutes = require("./analytics");
const classifyRoutes = require("./classify");
const reportsRoutes = require("./reports");
const guestRoutes = require("./guest");
const recommendationRoutes = require("./recommendationRoutes");
const generalRoutes = require("./general");
const subscriptionRoutes = require("./subscription");
const notificationRoutes = require("./notification");
const adminSubsRoutes = require("./adminSubscriptions");
const treatmentRoute = require("./treatment");
const contactRoute = require("./contact");
const adminRoute = require("./admin");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/history", historyRoutes);
router.use("/chat", chatRoutes);
router.use("/weather", weatherRoutes);
router.use("/forum", forumRoutes);
router.use("/plants", plantsRoutes);
router.use("/reminders", remindersRoutes);
router.use("/feedback", feedbackRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/classify", classifyRoutes);
router.use("/reports", reportsRoutes);
router.use("/guest", guestRoutes);
router.use("/recommendations", recommendationRoutes);
router.use("/stats", generalRoutes);
router.use("/subscribe", subscriptionRoutes);
router.use("/notification", notificationRoutes);
router.use("/admin/subscribe", adminSubsRoutes);
router.use("/treatment", treatmentRoute);
router.use("/contact", contactRoute);
router.use("/admin", adminRoute);

module.exports = router;
