const express = require("express");
const { register, login } = require("../controllers/authController");
const router = express.Router();

// POST /api/auth/register → register user
router.post("/register", register);

// POST /api/auth/login → login user/admin
router.post("/login", login);

module.exports = router;