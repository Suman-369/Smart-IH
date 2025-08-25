const express = require("express");
const { submitReport, getAllReports, getUserReports } = require("../controllers/reportController");
const authMiddleware = require("../middleware/auth");
const multer = require("multer");
const path = require("path");

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// POST /api/report → submit report (auth: user or admin)
router.post("/", authMiddleware(["user", "admin"]), upload.array("images", 5), submitReport);

// GET /api/report → get user's own reports (auth: user)
router.get("/", authMiddleware(["user"]), getUserReports);

// GET /api/report/all → get all reports (auth: admin)
router.get("/all", authMiddleware(["admin"]), getAllReports);

module.exports = router;
