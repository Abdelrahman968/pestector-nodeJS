const { v4: uuidv4 } = require("uuid");
const GuestUser = require("../models/GuestUser");
const { MAX_GUEST_SCANS } = require("../config/config");
const User = require("../models/User");

const getClientIp = (req) => {
  // Attempt to retrieve IP address from multiple sources
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] || // If IP is in header
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null)
  );
};

const getGuestId = async (req, res, next) => {
  if (!req.isGuest) {
    try {
      const user = await User.findById(req.user.id);
      if (user && user.linkedGuestId) {
        req.guestId = user.linkedGuestId;
      }
    } catch (error) {
      console.error("Error checking for linked guest ID:", error);
    }
    return next();
  }

  const guestIdCookie = req.cookies?.guestId;
  const ipAddress = getClientIp(req);

  try {
    let guestUser = null;

    // First check the cookie for guestId
    if (guestIdCookie) {
      guestUser = await GuestUser.findOne({ guestId: guestIdCookie });
    }

    // If no guestId found in the cookie, attempt to find the guest by IP address
    if (!guestUser) {
      guestUser = await GuestUser.findOne({ ipAddress });
    }

    // If no guest user is found, create a new guest
    if (!guestUser) {
      const newGuestId = uuidv4();
      guestUser = new GuestUser({
        ipAddress,
        guestId: newGuestId,
        scanCount: 0,
      });
      await guestUser.save();
    }

    req.guestId = guestUser.guestId;
    // Store the guestId in a cookie for a long duration
    res.cookie("guestId", guestUser.guestId, {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    next();
  } catch (error) {
    console.error("Error managing guest ID:", error);
    next(error); // Pass the error to the next middleware
  }
};

const trackGuestScan = async (req, res, next) => {
  if (!req.isGuest || !req.guestId) {
    return next();
  }

  try {
    let guestUser = await GuestUser.findOne({ guestId: req.guestId });

    if (!guestUser) {
      return next();
    }

    // Check if the scan count exceeds the limit
    if (guestUser.scanCount >= MAX_GUEST_SCANS) {
      return res.status(403).json({
        status: "error",
        message: `Guest scan limit of ${MAX_GUEST_SCANS} exceeded. Please register or log in to continue.`,
        limitReached: true,
      });
    }

    // Update the scan count and last scan date
    guestUser.scanCount += 1;
    guestUser.lastScan = new Date();
    await guestUser.save();

    next();
  } catch (error) {
    console.error("Error tracking guest scan:", error);
    next(error); // Pass the error to the next middleware
  }
};

module.exports = { getGuestId, trackGuestScan };
