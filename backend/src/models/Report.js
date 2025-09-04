const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  title: { type: String, required: true },
  description: { type: String, required: true },
  imageUrl: [String], // Changed to an array to store multiple image URLs
  imageId: [String], // Changed to an array to store multiple image IDs
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
  // Task assignment fields
  assignedDrone: { type: String },
  priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
  deadline: { type: Date },
  assignmentNotes: { type: String },
  assignedAt: { type: Date },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Report", reportSchema);