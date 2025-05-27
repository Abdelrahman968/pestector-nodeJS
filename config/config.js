// config.js
require("dotenv").config();

const PORT = process.env.PORT || 3001;
const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://localhost:8000";
const API_KEYS = new Set(
  process.env.API_KEYS ? process.env.API_KEYS.split(",") : []
); // Added a check for API_KEYS
const JWT_SECRET = process.env.JWT_SECRET;
const OPENCAGE_API_KEY = process.env.OPENCAGE_API_KEY;
const IPINFO_API_KEY = process.env.IPINFO_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI;
const MAX_GUEST_SCANS = parseInt(process.env.MAX_GUEST_SCANS || "3");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Correctly define SUBSCRIPTION_PLANS as a constant object
const SUBSCRIPTION_PLANS = {
  free: {
    name: "Free", // Added name property for consistency
    features: {
      // Nested features as assumed by classify.js
      scanLimit: 10,
      prioritySupport: false,
      advancedAnalytics: false,
      apiAccess: false,
    },
  },
  basic: {
    name: "Basic",
    features: {
      scanLimit: 50,
      prioritySupport: false,
      advancedAnalytics: true,
      apiAccess: false,
    },
  },
  premium: {
    name: "Premium",
    features: {
      scanLimit: 200,
      prioritySupport: true,
      advancedAnalytics: true,
      apiAccess: true,
    },
  },
  enterprise: {
    name: "Enterprise",
    features: {
      scanLimit: 1000,
      prioritySupport: true,
      advancedAnalytics: true,
      apiAccess: true,
    },
  },
};

module.exports = {
  PORT,
  PYTHON_API_URL,
  API_KEYS,
  JWT_SECRET,
  MONGODB_URI,
  MAX_GUEST_SCANS,
  GEMINI_API_KEY,
  SUBSCRIPTION_PLANS, // This will now export the correctly defined object
  OPENCAGE_API_KEY,
  IPINFO_API_KEY,
};
