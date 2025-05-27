// models/Analytics.js (unchanged, for reference)
const mongoose = require("mongoose");

const analyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  guestId: {
    type: String,
    required: false,
  },
  classification: {
    plant: {
      type: String,
      required: true,
    },
    condition: {
      type: String,
      required: true,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    model_source: {
      type: String,
      required: true,
      enum: ["ViT", "VGG", "Gemini", "Combined"],
    },
  },
  processing_time_seconds: {
    type: Number,
    required: true,
    min: 0,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Analytics", analyticsSchema);
