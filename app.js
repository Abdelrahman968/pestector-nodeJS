require("dotenv").config();

const path = require("path");
const fs = require("fs");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const { MONGODB_URI } = require("./config/config");
const authenticateToken = require("./middleware/auth");
const routes = require("./routes");

const app = express();
const logStream = fs.createWriteStream(path.join(__dirname, "log.txt"), {
  flags: "a",
});

// Setup middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Mount API routes
app.use("/api", routes);

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Health check endpoint
app.get("/api/health-check", (req, res) => {
  res.json({ message: "Backend server is healthy!" });
});

if (process.env.NODE_ENV === "development") {
  app.use(morgan("combined", { stream: logStream }));
} else {
  app.use(morgan("silent"));
}

// Rate limiting middleware
const rateLimit = require("express-rate-limit");

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});

if (process.env.NODE_ENV === "development") {
  app.use("/api", (req, res, next) => {
    console.log("Call TEST Middleware");
    next();
  });
} else {
  app.use("/api/", apiLimiter);
}

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

const staticPages = require("./staticRoutes");
app.use("/", staticPages);

app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${
        res.statusCode
      } - ${duration}ms`,
    );
  });

  next();
});

// Add route to serve uploaded images (with authentication)
app.get("/uploads/:filename", authenticateToken, (req, res) => {
  const filepath = path.join(__dirname, "uploads", req.params.filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({
      status: "error",
      message: "File not found",
    });
  }

  res.sendFile(filepath);
});

app.use("/api", routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: "error",
    message: err.message || "Something went wrong",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

module.exports = app;
