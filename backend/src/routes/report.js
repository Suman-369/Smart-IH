const express = require("express");
const {
  submitReport,
  getAllReports,
  getUserReports,
  getReportById,
  updateReportStatus,
} = require("../controllers/reportController");
const authMiddleware = require("../middleware/auth");
const multer = require("multer");
const path = require("path");

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// POST /api/reports → submit report (auth: user or admin)
router.post(
  "/",
  authMiddleware(["user", "admin"]),
  upload.array("images", 5),
  submitReport
);

// GET /api/reports → get user's own reports (auth: user)
router.get("/", authMiddleware(["user"]), getUserReports);

// GET /api/reports/all → get all reports (auth: admin)
router.get("/all", authMiddleware(["admin"]), getAllReports);

// GET /api/reports/:id → get specific report by ID (auth: user or admin)
router.get("/:id", authMiddleware(["user", "admin"]), getReportById);

// PUT /api/reports/:id/status → update report status (auth: admin)
router.put("/:id/status", authMiddleware(["admin"]), updateReportStatus);

module.exports = router;
