const mongoose = require("mongoose");

// Schema for Treatment Plan
const treatmentPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false, // Make userId optional
  },
  guestId: {
    type: String,
    required: false, // Make guestId optional
  },
  plantName: {
    type: String,
    required: true,
  },
  disease: {
    type: String,
    required: true,
  },
  treatment: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "in_progress", "completed", "failed"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Custom validator to ensure either userId or guestId is provided
treatmentPlanSchema.pre("validate", function (next) {
  if (!this.userId && !this.guestId) {
    return next(new Error("Either userId or guestId must be provided"));
  }
  next();
});

// Middleware to update `updatedAt` on save
treatmentPlanSchema.pre("save", function (next) {
  if (this.isModified()) {
    this.updatedAt = Date.now();
  }
  next();
});

// Export the TreatmentPlan model
module.exports = mongoose.model("TreatmentPlan", treatmentPlanSchema);
