const express = require("express");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const fs = require("fs");
const path = require("path");
const authenticateToken = require("../middleware/auth");
const multer = require("multer");

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Route to create a post
router.post(
  "/posts",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    if (req.isGuest) {
      return res.status(401).json({
        status: "error",
        message: "You must be logged in to create posts",
      });
    }

    try {
      const { title, content, tags } = req.body;

      if (!title || !content) {
        if (req.file && fs.existsSync(req.file.path))
          fs.unlinkSync(req.file.path);
        return res.status(400).json({
          status: "error",
          message: "Title and content are required",
        });
      }

      let imageUrl = null;
      if (req.file) {
        imageUrl = `/uploads/${path.basename(req.file.path)}`;
      }

      const post = new Post({
        userId: req.user.id,
        title,
        content,
        imageUrl,
        tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
      });

      await post.save();

      res.status(201).json({
        status: "success",
        message: "Post created successfully",
        post,
      });
    } catch (error) {
      console.error("Error creating post:", error);
      if (req.file && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      res.status(500).json({
        status: "error",
        message: "Failed to create post",
      });
    }
  }
);

// Route to fetch all posts with pagination
router.get("/posts", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .populate("userId", "username email")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Post.countDocuments();

    res.status(200).json({
      status: "success",
      posts,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total,
        start: skip + 1,
        end: Math.min(skip + limit, total),
      },
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch posts",
    });
  }
});

// Route to add a comment to a post
router.post("/posts/:postId/comments", authenticateToken, async (req, res) => {
  if (req.isGuest) {
    return res.status(401).json({
      status: "error",
      message: "You must be logged in to comment",
    });
  }

  try {
    const { content } = req.body;
    const { postId } = req.params;

    if (!content) {
      return res.status(400).json({
        status: "error",
        message: "Comment content is required",
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        status: "error",
        message: "Post not found",
      });
    }

    const comment = new Comment({
      postId,
      userId: req.user.id,
      content,
    });

    await comment.save();

    res.status(201).json({
      status: "success",
      message: "Comment added successfully",
      comment,
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to add comment",
    });
  }
});

module.exports = router;
