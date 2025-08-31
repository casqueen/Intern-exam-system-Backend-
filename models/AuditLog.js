const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  model: { type: String, required: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  changes: { type: Object },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("AuditLog", AuditLogSchema);