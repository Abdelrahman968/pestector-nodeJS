const express = require("express");
const Chat = require("../models/Chat");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

router.post("/", authenticateToken, async (req, res) => {
  try {
    const { message, chatId } = req.body;

    if (!message) {
      return res.status(400).json({
        status: "error",
        message: "Message content is required",
      });
    }

    let chat;

    if (chatId) {
      const query = req.isGuest
        ? { _id: chatId, guestId: req.guestId }
        : { _id: chatId, userId: req.user.id };

      chat = await Chat.findOne(query);

      if (!chat) {
        return res.status(404).json({
          status: "error",
          message: "Chat not found",
        });
      }
    } else {
      chat = new Chat({
        userId: req.isGuest ? null : req.user.id,
        guestId: req.isGuest ? req.guestId : null,
        messages: [],
        title: "Plant Chat " + new Date().toLocaleDateString(),
      });
    }

    chat.messages.push({
      role: "user",
      content: message,
      timestamp: new Date(),
    });

    const aiResponse = "Sample AI response"; // Replace with actual AI integration

    chat.messages.push({
      role: "assistant",
      content: aiResponse,
      timestamp: new Date(),
    });

    chat.updatedAt = new Date();
    await chat.save();

    res.json({
      status: "success",
      chatId: chat._id,
      message: {
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to process chat message",
    });
  }
});

module.exports = router;
