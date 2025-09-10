
const express = require("express");
const { register, login } = require("../controllers/authController");
const router = express.Router();

// register user
router.post("/register", register);

//  login user/admin
router.post("/login", login);

module.exports = router;