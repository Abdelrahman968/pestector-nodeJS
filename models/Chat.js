const mongoose = require("mongoose");

// Define the schema for the Chat model
const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Reference to the User model (for logged-in users)
  },
  guestId: {
    type: String,
  },
  messages: [
    {
      role: {
        type: String,
        enum: ["user", "assistant"],
        required: true,
      }, // Role of the message sender (user or assistant)
      content: {
        type: String,
        required: true,
      }, // Content of the message
      timestamp: {
        type: Date,
        default: Date.now,
      }, // Timestamp when the message was sent
    },
  ],
  title: {
    type: String,
    default: "Plant Chat",
  }, // Default title for the chat (can be customized)
  createdAt: {
    type: Date,
    default: Date.now,
  }, // Creation timestamp of the chat
  updatedAt: {
    type: Date,
    default: Date.now,
  }, // Last update timestamp of the chat
});

// Export the model so it can be used elsewhere in the application
module.exports = mongoose.model("Chat", chatSchema);
