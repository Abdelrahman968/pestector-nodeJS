const mongoose = require("mongoose");
const User = require("./User");

const historySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
    index: true, // Indexing to improve search speed
  },
  guestId: {
    type: String,
    required: false,
    index: true, // Indexing to improve performance when searching for guests
  },
  plantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Plant",
    required: false,
    index: true,
  },
  imageUrl: { type: String, required: true },
  filename: { type: String, required: true },
  relativePath: { type: String, required: false },
  originalFilename: { type: String, required: false },
  classification: { type: mongoose.Schema.Types.Mixed, required: true },
  timestamp: { type: Date, default: Date.now },
  notes: { type: String, maxlength: 500 },
});

// ✅ Check that the record contains a userId or guestId
historySchema.pre("save", function (next) {
  if (!this.userId && !this.guestId) {
    return next(new Error("The record must contain a userId or guestId"));
  }
  next();
});

// Update scanCount when a new record is added
historySchema.pre("save", async function (next) {
  try {
    if (this.userId) {
      const scanCount = await mongoose
        .model("History")
        .countDocuments({ userId: this.userId });
      await User.findByIdAndUpdate(this.userId, { scanCount });
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Update scanCount when a record is deleted
historySchema.pre("remove", async function (next) {
  try {
    if (this.userId) {
      const scanCount = await mongoose
        .model("History")
        .countDocuments({ userId: this.userId });
      await User.findByIdAndUpdate(this.userId, { scanCount });
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("History", historySchema);
