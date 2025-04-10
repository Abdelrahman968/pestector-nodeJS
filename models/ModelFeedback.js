const mongoose = require("mongoose");

const modelFeedbackSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    guestId: { type: String },
    historyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "History",
      required: true,
    },
    feedbackType: {
      type: String,
      enum: ["correct", "incorrect", "unsure"],
      required: true,
    },
    correctLabel: {
      type: String,
      required: function () {
        // Make sure the correctLabel is required only for 'incorrect' or 'unsure' feedback
        return (
          this.feedbackType === "incorrect" || this.feedbackType === "unsure"
        );
      },
    },
    comments: {
      type: String,
      minlength: [10, "Comments should be at least 10 characters long"],
      maxlength: [500, "Comments should not exceed 500 characters"],
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true } // Automatically manages `createdAt` and `updatedAt`
);

module.exports = mongoose.model("ModelFeedback", modelFeedbackSchema);
