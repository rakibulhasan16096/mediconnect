const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: {
      type: String,
      enum: ["patient", "doctor", "admin"],
      default: "patient",
    },
    phone: { type: String, trim: true },
    dateOfBirth: { type: Date },
    gender: {
      type: String,
      enum: ["male", "female", "other", "unspecified"],
      default: "unspecified",
    },
    avatarUrl: { type: String },
    isActive: { type: Boolean, default: true },

    // Doctor-specific fields
    specialization: { type: String },
    licenseNumber: { type: String },
    yearsOfExperience: { type: Number },
    consultationFee: { type: Number, default: 0 },
    bio: { type: String },
    availability: [
      {
        dayOfWeek: { type: Number, min: 0, max: 6 }, // 0 = Sunday
        startTime: { type: String }, // "09:00"
        endTime: { type: String }, // "17:00"
        slotDurationMinutes: { type: Number, default: 30 },
      },
    ],

    // Security / account hardening
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    passwordChangedAt: { type: Date },
    refreshTokenHash: { type: String, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true },
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  if (!this.isNew) this.passwordChangedAt = new Date();
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isLocked = function isLocked() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Never leak password hash even if select accidentally included
userSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokenHash;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
