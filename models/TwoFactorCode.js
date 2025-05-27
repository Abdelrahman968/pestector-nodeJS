const mongoose = require("mongoose");

const twoFactorCodeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
  },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: "5m" }, // Automatically delete after 5 minutes
});

module.exports = mongoose.model("TwoFactorCode", twoFactorCodeSchema);
