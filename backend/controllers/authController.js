const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

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

exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // identifier = email OR phone
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

    res.json({
      msg: "Login successful",
      token,
      user
    });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Email not registered" });

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = Date.now() + 1000 * 60 * 10; // 10 minutes

    user.resetToken = token;
    user.resetTokenExpiry = expiry;
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    });

    const resetURL = `http://localhost:5173/reset-password/${token}`;

    await transporter.sendMail({
      from: "TasteTrail <no-reply@tastetrail.com>",
      to: email,
      subject: "Reset Your Password",
      html: `
        <h3>Password Reset Request</h3>
        <p>Click the link below to reset your password:</p>
        <a href="${resetURL}" target="_blank">Reset Password</a>
        <p>This link expires in 10 minutes.</p>
      `
    });

    res.json({ msg: "Reset email sent successfully" });

  } catch (error) {
    res.status(500).json({ msg: "Server error", error });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ msg: "Invalid or expired token" });

    const hashed = await bcrypt.hash(newPassword, 10);

    user.password = hashed;
    user.resetToken = null;
    user.resetTokenExpiry = null;

    await user.save();

    res.json({ msg: "Password reset successful" });

  } catch (error) {
    res.status(500).json({ msg: "Server error", error });
  }
};