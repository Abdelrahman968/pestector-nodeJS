const express = require("express");
const Post = require("../models/Post");
const fs = require("fs");
const path = require("path");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// Route to create a post
router.post("/posts", authenticateToken, async (req, res) => {
  // Check if the user is a guest
  if (req.isGuest) {
    return res.status(401).json({
      status: "error",
      message: "You must be logged in to create posts",
    });
  }

  try {
    const { title, content, tags, image } = req.body;

    // Ensure title and content are provided
    if (!title || !content) {
      return res.status(400).json({
        status: "error",
        message: "Title and content are required",
      });
    }

    // Handle image upload or use the provided image URL
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${path.basename(req.file.path)}`;
    } else if (image) {
      imageUrl = image;
    }

    // Create new post
    const post = new Post({
      userId: req.user.id,
      title,
      content,
      imageUrl,
      tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
    });

    // Save post to the database
    await post.save();

    res.status(201).json({
      status: "success",
      message: "Post created successfully",
      post,
    });
  } catch (error) {
    console.error("Error creating post:", error);

    // Clean up uploaded image file if an error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      status: "error",
      message: "Failed to create post",
    });
  }
});

module.exports = router;
