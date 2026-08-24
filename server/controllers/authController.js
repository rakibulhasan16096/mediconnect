const asyncHandler = require("express-async-handler");
const validator = require("validator");
const crypto = require("crypto");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

// @desc  Register new user (patient or doctor)
// @route POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    role,
    phone,
    specialization,
    licenseNumber,
    consultationFee,
  } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Name, email and password are required");
  }

  if (!validator.isEmail(email)) {
    res.status(400);
    throw new Error("Please provide a valid email address");
  }

  if (password.length < 8) {
    res.status(400);
    throw new Error("Password must be at least 8 characters long");
  }

  // Only allow patient/doctor self-registration; admin accounts are provisioned manually
  const allowedRole = ["patient", "doctor"].includes(role) ? role : "patient";

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    res.status(409);
    throw new Error("An account with this email already exists");
  }

  const user = await User.create({
    name,
    email,
    password,
    role: allowedRole,
    phone,
    ...(allowedRole === "doctor" && {
      specialization,
      licenseNumber,
      consultationFee,
    }),
  });

  const token = generateToken(user._id, user.role);
  res.status(201).json({ success: true, token, user });
});

// @desc  Authenticate user & get token
// @route POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+password",
  );

  // Use a generic error message to avoid revealing whether the email exists
  const invalidCredsError = () => {
    res.status(401);
    throw new Error("Invalid email or password");
  };

  if (!user) return invalidCredsError();

  if (user.isLocked()) {
    res.status(423);
    throw new Error(
      "Account temporarily locked due to too many failed login attempts. Try again later.",
    );
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    return invalidCredsError();
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error("This account has been deactivated. Contact support.");
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  const token = generateToken(user._id, user.role);
  res.json({ success: true, token, user });
});

// @desc  Get current logged-in user profile
// @route GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

// @desc  Change password while logged in
// @route PUT /api/auth/change-password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error("Current and new password are required");
  }
  if (newPassword.length < 8) {
    res.status(400);
    throw new Error("New password must be at least 8 characters long");
  }

  const user = await User.findById(req.user._id).select("+password");
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    res.status(401);
    throw new Error("Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  const token = generateToken(user._id, user.role);
  res.json({ success: true, message: "Password updated successfully", token });
});

// @desc  Request a password reset link
// @route POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  // Always respond the same way, whether or not the email exists,
  // so attackers can't use this endpoint to discover registered emails
  const genericResponse = {
    success: true,
    message:
      "If an account with that email exists, a password reset link has been sent.",
  };

  if (!user) {
    return res.json(genericResponse);
  }

  // Generate a random token, store only its hash in the DB
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  await user.save();

  const resetUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/reset-password/${rawToken}`;

  // NOTE: No email service is configured yet in this project.
  // In production, this link would be emailed via a service like SendGrid or Nodemailer.
  // For now, it is logged to the server console so it can be used for testing.
  console.log("\n----- PASSWORD RESET LINK (dev only) -----");
  console.log(`User: ${user.email}`);
  console.log(resetUrl);
  console.log("-------------------------------------------\n");

  res.json(genericResponse);
});

// @desc  Reset password using a valid token
// @route PUT /api/auth/reset-password/:token
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    res.status(400);
    throw new Error("New password must be at least 8 characters long");
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  }).select("+resetPasswordToken +resetPasswordExpires");

  if (!user) {
    res.status(400);
    throw new Error(
      "This reset link is invalid or has expired. Please request a new one.",
    );
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  const authToken = generateToken(user._id, user.role);
  res.json({
    success: true,
    message: "Password has been reset successfully.",
    token: authToken,
  });
});

module.exports = {
  register,
  login,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
};
