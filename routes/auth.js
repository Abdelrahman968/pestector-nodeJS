const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const {
  JWT_SECRET,
  OPENCAGE_API_KEY,
  IPINFO_API_KEY,
  SUBSCRIPTION_PLANS,
} = require("../config/config");
const User = require("../models/User");
const History = require("../models/History");
const Chat = require("../models/Chat");
const authenticateToken = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Localized database of country codes
const countryCallingCodes = {
  US: "+1",
  GB: "+44",
  EG: "+20",
  SA: "+966",
  AE: "+971",
  IN: "+91",
  FR: "+33",
  DE: "+49",
  IT: "+39",
  ES: "+34",
  CN: "+86",
  JP: "+81",
  CA: "+1",
  AU: "+61",
  BR: "+55",
  RU: "+7",
  KR: "+82",
  MX: "+52",
  ZA: "+27",
  NG: "+234",
  AR: "+54",
  TR: "+90",
  IT: "+39",
  KR: "+82",
  PK: "+92",
  TH: "+66",
  ID: "+62",
  PH: "+63",
  MY: "+60",
  NG: "+234",
  KR: "+82",
  SE: "+46",
  NO: "+47",
  FI: "+358",
  DK: "+45",
  PL: "+48",
  CH: "+41",
  BE: "+32",
  AT: "+43",
  NL: "+31",
  IE: "+353",
  PT: "+351",
  IL: "+972",
  KZ: "+7",
  VN: "+84",
  EG: "+20",
  JO: "+962",
  KW: "+965",
  QA: "+974",
  LB: "+961",
  SY: "+963",
  YE: "+967",
  // Add more country codes as needed...
};

// Function to get user's location (Geolocation API or IP-based)
async function getUserLocation(req) {
  return new Promise((resolve, reject) => {
    if (req.body.latitude && req.body.longitude) {
      // Use the coordinates provided in the request body
      resolve({ latitude: req.body.latitude, longitude: req.body.longitude });
    } else {
      if (typeof window !== "undefined" && navigator.geolocation) {
        // Using the Geolocation API if it's available (browser-based)
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            resolve({ latitude, longitude });
          },
          (error) => {
            console.error(
              "Error getting location using Geolocation API:",
              error
            );
            resolve(getLocationByIP(req)); // Fallback to IP-based geolocation
          }
        );
      } else {
        // Fallback to IP-based geolocation if Geolocation API is unavailable (server-side)
        resolve(getLocationByIP(req));
      }
    }
  });
}

// Function to get location based on the user's IP address
async function getLocationByIP(req) {
  try {
    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress; // Get the IP address from request headers
    const response = await axios.get(
      `https://ipinfo.io/${ipAddress}/json?token=IPINFO_API_KEY`
    );

    if (response.data && response.data.loc) {
      const [latitude, longitude] = response.data.loc.split(",");
      return {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      };
    } else {
      throw new Error("Unable to retrieve location from IP");
    }
  } catch (error) {
    console.error("Error getting location from IP:", error);
    throw new Error("Unable to retrieve location");
  }
}

// Function to get country code from location coordinates using the OpenCage API
async function getCountryCode(lat, lng) {
  try {
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${OPENCAGE_API_KEY}`;
    const response = await axios.get(url);

    if (response.data.results.length > 0) {
      const addressComponents = response.data.results[0].components;
      const countryCode = addressComponents.country_code.toUpperCase(); // Example: “EG”

      if (countryCallingCodes[countryCode]) {
        return countryCallingCodes[countryCode];
      } else {
        return "Service is not available in your country."; // If the country code is not present
      }
    }
    return "Service is not available in your country."; // If no results are found
  } catch (error) {
    console.error("Error fetching country code:", error);
    return "Service is not available in your country."; // If an error occurs while connecting to the API
  }
}

async function getLocationByIP(req) {
  try {
    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;

    // Check if the IP is localhost (127.0.0.1 or ::1) and return mock location
    if (ipAddress === "127.0.0.1" || ipAddress === "::1") {
      console.warn("Localhost IP detected. Returning mock location.");
      // Return mock location for localhost (Egypt)
      return { latitude: 31.0312, longitude: 31.3347 };
    }

    // Proceed with actual API call for non-local IP addresses
    const response = await axios.get(
      `https://ipinfo.io/${ipAddress}/json?token=IPINFO_API_KEY`
    );

    if (response.data && response.data.loc) {
      const [latitude, longitude] = response.data.loc.split(",");
      return {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      };
    } else {
      throw new Error("Unable to retrieve location from IP");
    }
  } catch (error) {
    console.error("Error getting location from IP:", error.message);
    // Return a mock location in case of error for development purposes
    return { latitude: 31.0312, longitude: 31.3347 }; // You can customize this
  }
}

// Configure multer to store uploaded files in the 'uploads/' folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/"); // Save files in the 'uploads' directory
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname); // Get file extension
    const baseName = path.basename(file.originalname, ext); // Get original name without extension
    const timestamp = Date.now(); // Generate timestamp

    cb(null, uniqueSuffix + ext); // Generate a unique filename
  },
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true); // Accept the file
  } else {
    cb(new Error("Only image files (JPEG, PNG, GIF) are allowed!"), false); // Reject the file
  }
};

// Set up multer with file size limit and file filter
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit file size to 5MB
  },
});

// Register a new user
router.post("/register", async (req, res) => {
  try {
    let { username, email, password, phoneNumber, fullName } = req.body;
    let profileImage = req.file ? `/uploads/${req.file.filename}` : null; // Assign file path or null

    if (!username || !email || !password || !phoneNumber) {
      return res.status(400).json({
        message: "Username, email, phoneNumber, and password are required",
      });
    }

    // Get user's location (latitude, longitude)
    const { latitude, longitude } = await getUserLocation(req);

    // Add the country code if it doesn't exist
    if (!phoneNumber.startsWith("+") && latitude && longitude) {
      const countryCode = await getCountryCode(latitude, longitude);
      if (countryCode) {
        phoneNumber = `${countryCode}${phoneNumber.replace(/^0/, "")}`;
      }
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { email }, { phoneNumber }],
    });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Username, email, or phoneNumber already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const guestId = req.cookies?.guestId;

    const user = new User({
      profileImage,
      username,
      fullName,
      email,
      phoneNumber,
      password: hashedPassword,
      linkedGuestId: guestId,
      location:
        latitude && longitude
          ? { latitude, longitude, lastUpdated: new Date() }
          : null,
    });

    await user.save();

    if (guestId) {
      await History.updateMany(
        { guestId },
        { $set: { userId: user._id }, $unset: { guestId: "" } }
      );
      await Chat.updateMany(
        { guestId },
        { $set: { userId: user._id }, $unset: { guestId: "" } }
      );
    }

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Registration error:", error);
    res
      .status(500)
      .json({ message: "Failed to register user", error: error.message });
  }
});

router.post("/2fa/enable", authenticateToken, async (req, res) => {
  if (req.isGuest)
    return res.status(401).json({ message: "Authentication required" });

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const secret = speakeasy.generateSecret({ length: 20 });
    user.twoFactorSecret = secret.base32;
    await user.save();

    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret.ascii,
      label: `Pestector:${user.email}`,
      issuer: "Pestector",
    });

    // Generate QR code using await
    const data_url = await qrcode.toDataURL(otpauthUrl);

    res.json({
      message: "2FA enabled successfully",
      secret: secret.base32,
      qrCode: data_url,
    });
  } catch (error) {
    console.error("2FA enable error:", error);
    res.status(500).json({ message: "Failed to enable 2FA" });
  }
});

router.post("/2fa/disable", authenticateToken, async (req, res) => {
  if (req.isGuest)
    return res.status(401).json({ message: "Authentication required" });

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.twoFactorSecret = undefined; // Clear the 2FA secret
    await user.save();

    res.json({ message: "2FA disabled successfully" });
  } catch (error) {
    console.error("2FA disable error:", error);
    res.status(500).json({ message: "Failed to disable 2FA" });
  }
});

router.post("/2fa/login-verify", async (req, res) => {
  try {
    const { userId, token } = req.body; // 'token' here is the 2FA code
    if (!userId || !token) {
      return res
        .status(400)
        .json({ message: "User ID and token are required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
    });

    if (!verified) {
      return res.status(401).json({ message: "Invalid 2FA token" });
    }

    const expiresIn = user.role === "admin" ? "60d" : "30d";
    const jwtToken = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn }
    );

    res.json({
      token: jwtToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        location: user.location,
      },
    });
  } catch (error) {
    console.error("2FA login verification error:", error);
    res.status(500).json({ message: "Failed to verify 2FA" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password, latitude, longitude } = req.body;

    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    user.lastLogin = new Date();
    if (latitude && longitude) {
      user.location = { latitude, longitude, lastUpdated: new Date() };
    }
    await user.save();

    // Check if 2FA is enabled
    if (user.twoFactorSecret) {
      return res.json({
        message: "2FA required",
        userId: user._id,
      });
    }

    // If 2FA is not enabled, proceed with normal login
    const expiresIn = user.role === "admin" ? "30d" : "24h";
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        location: user.location,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

router.get("/verify", authenticateToken, (req, res) => {
  res.json({ status: "success", role: req.user.role });
});

// Token refresh endpoint
router.post("/refresh-token", async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    // Verify the old token
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    // Fetch the updated user from the database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create a new token with the updated user role
    const newToken = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role, // Role will now be 'admin' if updated
      },
      JWT_SECRET,
      { expiresIn: "1h" } // Adjust expiration time
    );

    // Send the new token to the client
    res.json({ token: newToken });
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
});

// Update user location
router.post("/location", authenticateToken, async (req, res) => {
  if (req.isGuest)
    return res.status(401).json({ message: "Authentication required" });

  try {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude)
      return res
        .status(400)
        .json({ message: "Latitude and longitude are required" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.location = { latitude, longitude, lastUpdated: new Date() };
    await user.save();

    res.json({
      message: "Location updated successfully",
      location: user.location,
    });
  } catch (error) {
    console.error("Error updating location:", error);
    res.status(500).json({ message: "Failed to update location" });
  }
});

// Get user profile
router.get("/profile", authenticateToken, async (req, res) => {
  if (req.isGuest)
    return res.status(401).json({ message: "Authentication required" });

  try {
    const user = await User.findById(req.user.id).select("-password"); // Exclude password
    if (!user) return res.status(404).json({ message: "User not found" });

    const currentPlan = user.subscription?.currentPlan || "free";
    const planDetails =
      SUBSCRIPTION_PLANS[currentPlan] || SUBSCRIPTION_PLANS.free;

    if (
      !user.subscription ||
      JSON.stringify(user.subscription.features) !== JSON.stringify(planDetails)
    ) {
      user.subscription = {
        currentPlan,
        status: user.subscription?.status || "active",
        features: { ...planDetails },
      };
      await user.save();
    }

    const scansMadeToday = user.scanCount || 0;
    const scanLimit = user.subscription.features.scanLimit;
    const scansRemaining = Math.max(0, scanLimit - scansMadeToday);

    const subscriptionInfo = {
      plan: currentPlan,
      scan_limit: scanLimit,
      scans_used: scansMadeToday,
      scans_remaining: scansRemaining,
      has_advanced_analytics: user.subscription.features.advancedAnalytics,
      priority_support: user.subscription.features.prioritySupport,
      api_access: user.subscription.features.apiAccess,
    };

    const enhancedResponse = {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        profileImage: user.profileImage,
        location: user.location,
        role: user.role,
        subscription: user.subscription,
        twoFactorSecret: !!user.twoFactorSecret,
      },
      subscription_info: subscriptionInfo,
    };

    res.json(enhancedResponse);
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

// Link guest history to user account
router.post("/link-guest", authenticateToken, async (req, res) => {
  if (req.isGuest)
    return res.status(401).json({ message: "Authentication required" });

  try {
    const { guestId } = req.body;
    if (!guestId)
      return res.status(400).json({ message: "Guest ID is required" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.linkedGuestId = guestId;
    await user.save();

    await History.updateMany(
      { guestId },
      { $set: { userId: user._id }, $unset: { guestId: "" } }
    );
    await Chat.updateMany(
      { guestId },
      { $set: { userId: user._id }, $unset: { guestId: "" } }
    );

    res.json({ message: "Guest history linked successfully" });
  } catch (error) {
    console.error("Error linking guest:", error);
    res.status(500).json({ message: "Failed to link guest history" });
  }
});

// Update user profile route with file upload
router.put(
  "/profile",
  authenticateToken,
  upload.single("profileImage"),
  async (req, res) => {
    if (req.isGuest)
      return res.status(401).json({ message: "Authentication required" });

    try {
      // Destructure the incoming request data from the body
      const {
        username,
        email,
        password,
        phoneNumber,
        location,
        subscription,
        fullName,
      } = req.body;

      // Find the user by ID
      const user = await User.findById(req.user.id);

      if (!user) return res.status(404).json({ message: "User not found" });

      // Update user details if provided in the request
      if (username) user.username = username;
      if (email) user.email = email;
      if (password) user.password = await bcrypt.hash(password, 10);
      if (phoneNumber) user.phoneNumber = phoneNumber;
      if (fullName) user.fullName = fullName;

      // Check if a profile image has been uploaded
      if (req.file) {
        console.log("Uploaded file:", req.file); // Log the file details to check if it was uploaded correctly
        user.profileImage = req.file.path; // Save the file path in the user object
      }

      // Update location details if provided
      if (location) {
        user.location.latitude = location.latitude;
        user.location.longitude = location.longitude;
        user.location.lastUpdated = new Date(); // Update timestamp for location
      }

      // Handle subscription updates for admin users only
      if (subscription && user.role === "admin") {
        if (subscription.currentPlan)
          user.subscription.currentPlan = subscription.currentPlan;
        if (subscription.status) user.subscription.status = subscription.status;
        if (subscription.expiresAt)
          user.subscription.expiresAt = subscription.expiresAt;
        if (subscription.features) {
          if (subscription.features.scanLimit !== undefined)
            user.subscription.features.scanLimit =
              subscription.features.scanLimit;
          if (subscription.features.prioritySupport !== undefined)
            user.subscription.features.prioritySupport =
              subscription.features.prioritySupport;
          if (subscription.features.advancedAnalytics !== undefined)
            user.subscription.features.advancedAnalytics =
              subscription.features.advancedAnalytics;
          if (subscription.features.apiAccess !== undefined)
            user.subscription.features.apiAccess =
              subscription.features.apiAccess;
        }
      } else if (subscription) {
        return res
          .status(403)
          .json({ message: "Only admins can update subscription details" });
      }

      // Save the updated user information
      await user.save();

      res.json({
        message: "Profile updated successfully", // Respond with a success message
        user: {
          id: user._id,
          fullName: user.fullName,
          profileImage: user.profileImage,
          username: user.username,
          email: user.email,
          role: user.role,
          phoneNumber: user.phoneNumber,
          location: user.location,
          subscription: user.subscription,
        },
      });
    } catch (error) {
      console.error("Profile update error:", error); // Log error details for debugging
      res.status(500).json({ message: "Failed to update profile" }); // Respond with an error message
    }
  }
);

router.post("/logout", (req, res) => {
  try {
    // Clear the token cookie
    res.clearCookie("token");

    // Send success response
    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error during logout",
    });
  }
});

router.delete("/account", authenticateToken, async (req, res) => {
  if (req.isGuest)
    return res.status(401).json({ message: "Authentication required" });

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Delete user's history and chats
    await History.deleteMany({ userId: user._id });
    await Chat.deleteMany({ userId: user._id });

    // Delete the user
    await User.findByIdAndDelete(req.user.id);

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Account deletion error:", error);
    res.status(500).json({ message: "Failed to delete account" });
  }
});

module.exports = router;
