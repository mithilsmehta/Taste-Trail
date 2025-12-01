const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

// REGISTER
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    const emailExists = await User.findOne({ email });
    if (emailExists) return res.status(400).json({ msg: "Email already exists" });

    const phoneExists = await User.findOne({ phone });
    if (phoneExists) return res.status(400).json({ msg: "Phone already registered" });

    const hashed = await bcrypt.hash(password, 10);

    const newUser = new User({
      firstName,
      lastName,
      email,
      phone,
      password: hashed
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

    const user =
      (await User.findOne({ email: identifier })) ||
      (await User.findOne({ phone: identifier }));

    if (!user) return res.status(400).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Incorrect password" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ msg: "Login successful", token, user });
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

    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    await user.save();

    const resetURL = `http://localhost:5173/reset-password/${resetToken}`;

    await resend.emails.send({
      from: "TasteTrail <support@tastetrail.com>",
      to: user.email,
      subject: "Reset your password",
      html: `
        <h3>Password Reset Request</h3>
        <p>Click the link below to reset your password (valid for 15 minutes):</p>
        <a href="${resetURL}" style="color: white; background: orange; padding: 10px 15px; border-radius: 5px; text-decoration: none;">Reset Password</a>
      `
    });

    res.json({ msg: "Password reset link sent" });
  } catch (err) {
    res.status(500).json({ msg: "Something went wrong" });
  }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ msg: "Invalid or expired token" });

    const hashed = await bcrypt.hash(newPassword, 10);

    user.password = hashed;
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;

    await user.save();

    res.json({ msg: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error });
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

    const updated = await User.findByIdAndUpdate(
      userId,
      {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone
      },
      { new: true }
    );

    return res.json({ user: updated });
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