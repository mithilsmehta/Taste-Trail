const express = require("express");
const {
  register,
  login,
  updateProfile,
  changePassword
} = require("../controllers/authController.js");

const authMiddleware = require("../middleware/authMiddleware.js");

const router = express.Router();

// PUBLIC ROUTES
router.post("/register", register);
router.post("/login", login);

// PROTECTED ROUTES
router.put("/update-profile/:id", authMiddleware, updateProfile);
router.put("/change-password/:id", authMiddleware, changePassword);

module.exports = router;