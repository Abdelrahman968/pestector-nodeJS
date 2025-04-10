const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    guestId: { type: String },
    plantName: { type: String, required: true },
    careType: {
      type: String,
      enum: ["water", "fertilize", "prune", "repot", "inspect"],
      required: true,
    },
    frequency: { type: Number, required: true },
    lastCompleted: { type: Date, default: null }, // Default to null
    completedCount: { type: Number, default: 0 },
    nextDue: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value > Date.now(); // Ensure the nextDue is a future date
        },
        message: "nextDue must be a future date",
      },
    },
    notes: { type: String },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

module.exports = mongoose.model("Reminder", reminderSchema);
