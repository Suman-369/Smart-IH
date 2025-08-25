const Report = require("../models/Report");
const userModel = require("../models/user.model");
const { v4: uuidv4 } = require("uuid");
const uploadImg = require("../services/storage.service");

async function submitReport(req, res) {
  try {
    console.log('Report submission request received:', {
      body: req.body,
      files: req.files,
      user: req.user
    });
    
    const { title, description, lat, lng, reportType } = req.body;
    const userId = req.user.id;

    let imageUrls = [];
    let imageIds = [];

    // Handle multiple files
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Convert buffer to base64 for ImageKit
        const base64Image = file.buffer.toString('base64');
        const imageId = uuidv4();
        
        // Upload to ImageKit
        try {
          console.log('Uploading image to ImageKit:', {
            fileName: `${imageId}-${file.originalname}`,
            fileSize: file.size
          });
          
          const uploadResponse = await uploadImg(base64Image, `${imageId}-${file.originalname}`);
          console.log('Image uploaded successfully:', uploadResponse);
          
          imageUrls.push(uploadResponse.url);
          imageIds.push(uploadResponse.fileId);
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          // If ImageKit upload fails, we should return an error to the client
          // rather than continuing silently
          throw new Error(`Failed to upload image ${file.originalname}: ${uploadError.message}`);
        }
      }
    }

    const report = await Report.create({
      user: userId,
      title: title || description.substring(0, 50),
      description: description,
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
      report: report
    });
  } catch (error) {
    console.error('Report submission error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

async function getAllReports(req, res) {
  try {
    const reports = await Report.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json({
      reports: reports
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

async function getUserReports(req, res) {
  try {
    const userId = req.user.id;
    const reports = await Report.find({ user: userId })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json({
      reports: reports
    });
  } catch (error) {
    console.error('Get user reports error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

module.exports = {
  submitReport,
  getAllReports,
  getUserReports
};
