const Report = require("../models/Report");
const userModel = require("../models/user.model");
const { v4: uuidv4 } = require("uuid");
const uploadImg = require("../services/storage.service");

// Submit a new report
async function submitReport(req, res) {
  try {
    const { title, description, lat, lng, reportType } = req.body;
    const userId = req.user.id;
    let imageUrls = [], imageIds = [];

    if (req.files?.length) {
      for (const file of req.files) {
        const base64Image = file.buffer.toString('base64');
        const imageId = uuidv4();

        const uploadResponse = await uploadImg(base64Image, `${imageId}-${file.originalname}`);
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
      reportType: reportType || 'text',
      location: {
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      }
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

module.exports = {
  submitReport,
  getAllReports,
  getUserReports,
};
