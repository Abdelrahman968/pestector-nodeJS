const express = require("express");
const Reminder = require("../models/Reminder");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

router.post("/", authenticateToken, async (req, res) => {
  try {
    const { plantName, careType, frequency, notes } = req.body;

    // Validate input fields
    if (!plantName || !careType || !frequency) {
      return res.status(400).json({
        status: "error",
        message: "Plant name, care type, and frequency are required",
      });
    }

    // Ensure frequency is a valid positive number
    if (isNaN(frequency) || frequency <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Frequency must be a positive number",
      });
    }

    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + frequency);

    const reminder = new Reminder({
      userId: req.isGuest ? null : req.user.id,
      guestId: req.isGuest ? req.guestId : null,
      plantName,
      careType,
      frequency,
      nextDue,
      notes,
    });

    await reminder.save();

    res.status(201).json({
      status: "success",
      message: "Reminder created successfully",
      reminder,
    });
  } catch (error) {
    console.error("Error creating reminder:", error.message);
    res.status(500).json({
      status: "error",
      message: "Failed to create reminder",
      details: error.message,
    });
  }
});

router.get("/", authenticateToken, async (req, res) => {
  try {
    // Fetch reminders based on the user type (guest or authenticated user)
    const query = req.isGuest
      ? { guestId: req.guestId }
      : { userId: req.user.id };

    const reminders = await Reminder.find(query);

    res.status(200).json({
      status: "success",
      reminders,
    });
  } catch (error) {
    console.error("Error fetching reminders:", error.message);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch reminders",
      details: error.message,
    });
  }
});

router.put("/:id/complete", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const reminder = await Reminder.findById(id);

    if (!reminder) {
      return res
        .status(404)
        .json({ status: "error", message: "Reminder not found" });
    }

    // Mark the reminder as completed by setting lastCompleted to the current date
    reminder.lastCompleted = new Date();

    // Increment the completedCount
    reminder.completedCount += 1;

    // Calculate the nextDue date based on the frequency
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + reminder.frequency);
    reminder.nextDue = nextDueDate;

    await reminder.save();

    res.status(200).json({
      status: "success",
      message: "Reminder marked as completed",
      reminder,
    });
  } catch (error) {
    console.error("Error updating reminder:", error.message);
    res.status(500).json({
      status: "error",
      message: "Failed to update reminder",
      details: error.message,
    });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const reminder = await Reminder.findByIdAndDelete(id);

    if (!reminder) {
      return res
        .status(404)
        .json({ status: "error", message: "Reminder not found" });
    }

    res.status(200).json({
      status: "success",
      message: "Reminder deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting reminder:", error.message);
    res.status(500).json({
      status: "error",
      message: "Failed to delete reminder",
      details: error.message,
    });
  }
});

module.exports = router;
