const mongoose = require("mongoose");

// Schema definition for GuestUser
const guestUserSchema = new mongoose.Schema({
  ipAddress: {
    type: String,
    required: true, // IP address is required
  },
  guestId: {
    type: String,
    required: true,
    unique: true, // Ensures that each guest has a unique ID
  },
  scanCount: {
    type: Number,
    default: 0, // Default scan count is set to 0
  },
  lastScan: {
    type: Date,
    default: Date.now, // Sets the default value to the current date/time
  },
  createdAt: {
    type: Date,
    default: Date.now, // Sets the creation date to the current date/time
  },
});

// Unnecessary : unique: true make index by default
// guestUserSchema.index({ guestId: 1 });

// Middleware to automatically update `lastScan` whenever a guest scans
guestUserSchema.pre("save", function (next) {
  if (this.isModified("scanCount")) {
    this.lastScan = Date.now(); // Update last scan time when scan count changes
  }
  next();
});

// Export the GuestUser model based on the schema
module.exports = mongoose.model("GuestUser", guestUserSchema);
