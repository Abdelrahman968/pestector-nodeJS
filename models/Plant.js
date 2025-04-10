const mongoose = require("mongoose");

const plantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    guestId: { type: String },
    name: { type: String, required: true },
    species: { type: String },
    location: { type: String },
    acquisitionDate: { type: Date },
    imageUrl: { type: String },
    healthHistory: [
      {
        date: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ["healthy", "concerning", "diseased", "recovering"],
          default: "healthy", // Set default status to "healthy"
        },
        notes: { type: String },
      },
    ],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt
);

// Add index for better performance on userId and guestId fields
plantSchema.index({ userId: 1 });
plantSchema.index({ guestId: 1 });

module.exports = mongoose.model("Plant", plantSchema);
