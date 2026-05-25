const express = require("express");
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword
} = require("../controllers/authController.js");

const authMiddleware = require("../middleware/authMiddleware.js");

const router = express.Router();

// PUBLIC ROUTES
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// PROTECTED ROUTES
router.put("/update-profile/:id", authMiddleware, updateProfile);
router.put("/change-password/:id", authMiddleware, changePassword);

module.exports = router;