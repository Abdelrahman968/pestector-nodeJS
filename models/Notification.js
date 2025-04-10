const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["system", "subscription", "scan", "security", "feature"],
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true, // Ensures that extra spaces are removed
  },
  message: {
    type: String,
    required: true,
    trim: true, // Ensures that extra spaces are removed
  },
  read: {
    type: String,
    enum: ["unread", "read"], // More extensible than just Boolean
    default: "unread",
  },
  link: {
    type: String,
    default: null,
    validate: {
      validator: function (v) {
        // Ensure it's a valid URL if provided
        return v === null || /^(ftp|http|https):\/\/[^ "]+$/.test(v);
      },
      message: (props) => `${props.value} is not a valid URL!`,
    },
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  deletedAt: {
    type: Date,
    default: null, // Allows for soft deletion
  },
});

// Automatically update the `updatedAt` field on document save
notificationSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for better query performance
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ read: 1, createdAt: -1 });

// Soft delete method
notificationSchema.methods.softDelete = function () {
  this.deletedAt = Date.now();
  return this.save();
};

module.exports = mongoose.model("Notification", notificationSchema);
