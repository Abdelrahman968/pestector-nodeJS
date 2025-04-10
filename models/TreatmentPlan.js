const mongoose = require("mongoose");

// Schema for Treatment Plan
const treatmentPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  guestId: {
    type: String,
    required: function () {
      return !this.userId;
    }, // Ensures that either guestId or userId is provided
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

// Middleware to update `updatedAt` on save
treatmentPlanSchema.pre("save", function (next) {
  if (this.isModified()) {
    this.updatedAt = Date.now();
  }
  next();
});

// Export the TreatmentPlan model
module.exports = mongoose.model("TreatmentPlan", treatmentPlanSchema);
