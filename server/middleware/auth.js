const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");

// Verifies JWT and attaches the authenticated user to req.user
const protect = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token provided");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      res.status(401);
      throw new Error("Not authorized, user no longer exists or is inactive");
    }

    // Invalidate tokens issued before a password change
    if (user.passwordChangedAt && decoded.iat) {
      const changedTimestamp = Math.floor(
        user.passwordChangedAt.getTime() / 1000,
      );
      if (decoded.iat < changedTimestamp) {
        res.status(401);
        throw new Error("Password was changed recently, please log in again");
      }
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401);
    throw new Error("Not authorized, token invalid or expired");
  }
});

// Restrict route to specific roles, e.g. authorize('doctor', 'admin')
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(
        `Role '${req.user ? req.user.role : "unknown"}' is not permitted to perform this action`,
      );
    }
    next();
  };

module.exports = { protect, authorize };
