const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  action: { type: String, required: true }, // e.g., "delete", "update", "bulk_delete"
  targetType: { type: String, required: true }, // e.g., "user", "history"
  targetId: { type: [mongoose.Schema.Types.Mixed], required: true }, // Could be single ID or array for bulk
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("AuditLog", auditLogSchema);
