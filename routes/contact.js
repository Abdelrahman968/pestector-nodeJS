const express = require("express");
const router = express.Router();
const Contact = require("../models/Contact");
const nodemailer = require("nodemailer");
require("dotenv").config();

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// POST /api/contact
router.post("/", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate input
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        status: "error",
        message: "All fields (name, email, subject, message) are required",
      });
    }

    // 1. Save to MongoDB
    const contact = new Contact({
      name,
      email,
      subject,
      message,
    });
    await contact.save();
    // console.log("Contact saved to MongoDB:", contact);

    // 2. Send email to se.abdelrahman968@gmail.com
    const mailOptions = {
      from: process.env.EMAIL_USER, // Your authenticated Gmail
      to: "se.abdelrahman968@gmail.com", // Your email to receive submissions
      replyTo: email, // User's email from the form
      subject: `New Contact Form Submission: ${subject}`,
      text: `
        Name: ${name}
        Email: ${email}
        Subject: ${subject}
        Message: ${message}
        Submitted At: ${new Date().toLocaleString()}
      `,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong> ${message}</p>
        <p><strong>Submitted At:</strong> ${new Date().toLocaleString()}</p>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    // console.log("Email sent to se.abdelrahman968@gmail.com:", info.response);

    // Success response
    res.status(200).json({
      status: "success",
      message: "Message received successfully",
    });
  } catch (error) {
    console.error("Processing error:", error.stack);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to process your message",
    });
  }
});

module.exports = router;
