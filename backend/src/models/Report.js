const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  // For Report

  user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  title: { type: String, required: true },
  description: { type: String, required: true },
  imageUrl: [String],
  imageId: [String],
  reportType: { type: String, enum: ["photo", "text"], default: "text" },
  status: {
    type: String,
    enum: ["pending", "reviewed", "resolved"],
    default: "pending",
  },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  // Task assignment to drone
  assignedDrone: { type: String },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium",
  },
  deadline: { type: Date },
  assignmentNotes: { type: String },
  assignedAt: { type: Date },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Report", reportSchema);
