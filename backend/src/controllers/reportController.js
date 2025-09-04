const Report = require("../models/Report");
const userModel = require("../models/user.model");
const { v4: uuidv4 } = require("uuid");
const uploadImg = require("../services/storage.service");

// Submit a new report
async function submitReport(req, res) {
  try {
    const { title, description, lat, lng, reportType } = req.body;
    const userId = req.user.id;
    let imageUrls = [],
      imageIds = [];

    if (req.files?.length) {
      for (const file of req.files) {
        const base64Image = file.buffer.toString("base64");
        const imageId = uuidv4();

        const uploadResponse = await uploadImg(
          base64Image,
          `${imageId}-${file.originalname}`
        );
        imageUrls.push(uploadResponse.url);
        imageIds.push(uploadResponse.fileId);
      }
    }

    const report = await Report.create({
      user: userId,
      title: title || description.substring(0, 50),
      description,
      imageUrl: imageUrls,
      imageId: imageIds,
      reportType: reportType || "text",
      location: {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      },
    });

    res.status(201).json({
      message: "Report submitted successfully",
      report,
    });
  } catch (error) {
    console.error("Report submission error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

// Fetch all reports (from database, not localhost)
async function getAllReports(req, res) {
  try {
    const reports = await Report.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .lean(); // lean returns plain JS objects, faster for large data sets[8]

    res.json({ reports });
  } catch (error) {
    console.error("Fetch all reports error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

// Fetch all reports from the current user
async function getUserReports(req, res) {
  try {
    const userId = req.user.id;
    const reports = await Report.find({ user: userId })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json({ reports });
  } catch (error) {
    console.error("Fetch user reports error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

// Get specific report by ID
async function getReportById(req, res) {
  try {
    const reportId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Find the report
    const report = await Report.findById(reportId).populate(
      "user",
      "name email"
    );

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Check if user has permission to view this report
    // Admins can view all reports, users can only view their own
    if (userRole !== "admin" && report.user._id.toString() !== userId) {
      return res.status(403).json({
        message: "Access denied. You can only view your own reports.",
      });
    }

    res.json({ report });
  } catch (error) {
    console.error("Fetch report by ID error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

// Update report status (admin only)
async function updateReportStatus(req, res) {
  try {
    const reportId = req.params.id;
    const { status } = req.body;

    // Validate status
    const validStatuses = ["pending", "reviewed", "resolved"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Must be one of: pending, reviewed, resolved",
      });
    }

    // Find and update the report
    const report = await Report.findByIdAndUpdate(
      reportId,
      { status },
      { new: true }
    ).populate("user", "name email");

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    res.json({
      message: "Report status updated successfully",
      report,
    });
  } catch (error) {
    console.error("Update report status error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

// Assign task to report (admin only)
async function assignTask(req, res) {
  try {
    const reportId = req.params.id;
    const { assignedDrone, priority, deadline, assignmentNotes } = req.body;
    const assignedBy = req.user.id;

    // Validate required fields
    if (!assignedDrone) {
      return res.status(400).json({
        message: "Assigned drone is required",
      });
    }

    // Validate priority
    const validPriorities = ["low", "medium", "high", "urgent"];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({
        message: "Invalid priority. Must be one of: low, medium, high, urgent",
      });
    }

    // Validate deadline if provided
    if (deadline) {
      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime())) {
        return res.status(400).json({
          message: "Invalid deadline date format",
        });
      }
      if (deadlineDate <= new Date()) {
        return res.status(400).json({
          message: "Deadline must be in the future",
        });
      }
    }

    // Find and update the report
    const report = await Report.findByIdAndUpdate(
      reportId,
      {
        assignedDrone,
        priority: priority || "medium",
        deadline: deadline ? new Date(deadline) : undefined,
        assignmentNotes,
        assignedAt: new Date(),
        assignedBy,
      },
      { new: true }
    ).populate("user", "name email").populate("assignedBy", "name email");

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    res.json({
      message: "Task assigned successfully",
      report,
    });
  } catch (error) {
    console.error("Assign task error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

module.exports = {
  submitReport,
  getAllReports,
  getUserReports,
  getReportById,
  updateReportStatus,
  assignTask,
};
