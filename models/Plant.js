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
          default: "healthy",
        },
        notes: { type: String },
      },
    ],

    growthLog: [
      {
        date: { type: Date, default: Date.now },
        height: { type: Number },
        leafCount: { type: Number },
        notes: { type: String },
        photoUrl: { type: String },
      },
    ],

    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

plantSchema.index({ userId: 1 });
plantSchema.index({ guestId: 1 });

// plantSchema.virtual("ageInDays").get(function () {
//   return Math.floor(
//     (Date.now() - this.acquisitionDate) / (1000 * 60 * 60 * 24)
//   );
// });

module.exports = mongoose.model("Plant", plantSchema);
