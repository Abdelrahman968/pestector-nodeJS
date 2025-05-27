const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/config");

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is not defined! Make sure to set it in [config/config.js]"
  );
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1] || req.cookies?.token;

  if (!token) {
    req.isGuest = true;
    return next();
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user; // Attach the decoded user to the request object
    req.isGuest = false;
    // console.log("Decoded token:", user); // Log the decoded token to check the role
    next();
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    return res.status(403).json({ message: "Invalid token" });
  }
};

module.exports = authenticateToken;
