const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// Create email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const normalizeUsualServings = (value) => {
  const servings = Number(value);
  if (!Number.isFinite(servings)) return 2;
  return Math.min(10, Math.max(1, Math.round(servings)));
};

// REGISTER
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, onboarding } = req.body;

    const emailExists = await User.findOne({ email });
    if (emailExists) return res.status(400).json({ msg: "Email already exists" });

    const cleanPhone = String(phone || "").trim();
    if (!cleanPhone) return res.status(400).json({ msg: "Phone number is required" });

    const phoneExists = await User.findOne({ phone: cleanPhone });
    if (phoneExists) return res.status(400).json({ msg: "Phone already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const cleanOnboarding = onboarding || {};

    const newUser = new User({
      firstName,
      lastName,
      email,
      phone: cleanPhone,
      password: hashed,
      preferences: {
        diet: cleanOnboarding.dietaryPreference || "",
        allergies: [],
        cuisines: []
      },
      onboarding: {
        displayName: cleanOnboarding.displayName || "",
        gender: cleanOnboarding.gender || "",
        ethnicity: cleanOnboarding.ethnicity || "",
        currentBase: cleanOnboarding.currentBase || "",
        dietaryPreference: cleanOnboarding.dietaryPreference || "",
        usualServings: normalizeUsualServings(cleanOnboarding.usualServings),
        healthyGoal: Number(cleanOnboarding.healthyGoal) || 50,
        heightCm: cleanOnboarding.heightCm ? Number(cleanOnboarding.heightCm) : null,
        weightKg: cleanOnboarding.weightKg ? Number(cleanOnboarding.weightKg) : null,
        bmi: cleanOnboarding.bmi ? Number(cleanOnboarding.bmi) : null
      }
    });

    await newUser.save();
    res.json({ msg: "Registration successful" });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const cleanIdentifier = String(identifier || "").trim();

    const user =
      (await User.findOne({ email: cleanIdentifier })) ||
      (await User.findOne({ phone: cleanIdentifier }));

    if (!user) return res.status(400).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Incorrect password" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "365d" }
    );

    const safeUser = user.toObject();
    delete safeUser.password;

    res.json({ msg: "Login successful", token, user: safeUser });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error });
  }
};

// FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ msg: "No user found with this email" });

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000;

    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetURL = `${frontendUrl}/reset-password/${resetToken}`;

    const mailOptions = {
      from: `"Tastewise" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Reset Your Password - Tastewise",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #FFC107 0%, #FF9800 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 15px 30px; background: #FFC107; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🍽️ Tastewise</h1>
            </div>
            <div class="content">
              <h2>Password Reset Request</h2>
              <p>Hello ${user.firstName},</p>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <div style="text-align: center;">
                <a href="${resetURL}" class="button">Reset Password</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${resetURL}</p>
              <p><strong>This link will expire in 15 minutes.</strong></p>
              <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
              <p>Best regards,<br>The Tastewise Team</p>
            </div>
            <div class="footer">
              <p>© 2024 Tastewise. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ msg: "Password reset link sent to your email" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ msg: "Failed to send reset email. Please try again." });
  }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    console.log("Reset password attempt with token:", token);

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      console.log("No user found with valid token");
      return res.status(400).json({ msg: "Invalid or expired token" });
    }

    console.log("User found, updating password for:", user.email);

    const hashed = await bcrypt.hash(newPassword, 10);

    user.password = hashed;
    user.resetToken = null;
    user.resetTokenExpiry = null;

    await user.save();

    console.log("Password updated successfully for:", user.email);

    res.json({ msg: "Password reset successful", success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

// GET PROFILE
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
};

// UPDATE PROFILE
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    const cleanPhone = String(req.body.phone || "").trim();
    const cleanOnboarding = req.body.onboarding || {};
    const existingUser = await User.findById(userId);

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (cleanPhone) {
      const phoneOwner = await User.findOne({ phone: cleanPhone, _id: { $ne: userId } });
      if (phoneOwner) {
        return res.status(400).json({ message: "Phone already registered" });
      }
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        ...(cleanPhone ? { phone: cleanPhone } : {}),
        preferences: {
          diet: cleanOnboarding.dietaryPreference || req.body.preferences?.diet || existingUser.preferences?.diet || "",
          allergies: req.body.preferences?.allergies || existingUser.preferences?.allergies || [],
          cuisines: req.body.preferences?.cuisines || existingUser.preferences?.cuisines || []
        },
        onboarding: {
          displayName: cleanOnboarding.displayName || "",
          gender: cleanOnboarding.gender || "",
          ethnicity: cleanOnboarding.ethnicity || "",
          currentBase: cleanOnboarding.currentBase || "",
          dietaryPreference: cleanOnboarding.dietaryPreference || "",
          usualServings: normalizeUsualServings(cleanOnboarding.usualServings || existingUser.onboarding?.usualServings),
          healthyGoal: Number(cleanOnboarding.healthyGoal) || 50,
          heightCm: cleanOnboarding.heightCm ? Number(cleanOnboarding.heightCm) : null,
          weightKg: cleanOnboarding.weightKg ? Number(cleanOnboarding.weightKg) : null,
          bmi: cleanOnboarding.bmi ? Number(cleanOnboarding.bmi) : null
        }
      },
      { new: true }
    );

    const safeUser = updated.toObject();
    delete safeUser.password;

    return res.json({ user: safeUser });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update profile" });
  }
};

// CHANGE PASSWORD
exports.changePassword = async (req, res) => {
  try {
    const userId = req.params.id;
    const { password, newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Current password incorrect" });

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;

    await user.save();

    return res.json({ message: "Password changed successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Error changing password" });
  }
};
