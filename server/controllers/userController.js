const asyncHandler = require("express-async-handler");
const User = require("../models/User");

// @desc  List all doctors (with optional specialization filter)
// @route GET /api/users/doctors
const listDoctors = asyncHandler(async (req, res) => {
  const { specialization } = req.query;
  const filter = { role: "doctor", isActive: true };
  if (specialization) filter.specialization = new RegExp(specialization, "i");

  const doctors = await User.find(filter).select(
    "name specialization yearsOfExperience consultationFee bio availability avatarUrl",
  );
  res.json({ success: true, count: doctors.length, doctors });
});

// @desc  Get a single doctor's public profile & availability
// @route GET /api/users/doctors/:id
const getDoctor = asyncHandler(async (req, res) => {
  const doctor = await User.findOne({
    _id: req.params.id,
    role: "doctor",
  }).select(
    "name specialization yearsOfExperience consultationFee bio availability avatarUrl",
  );
  if (!doctor) {
    res.status(404);
    throw new Error("Doctor not found");
  }
  res.json({ success: true, doctor });
});

// @desc  Update own availability (doctor only)
// @route PUT /api/users/availability
const updateAvailability = asyncHandler(async (req, res) => {
  const { availability } = req.body;
  if (!Array.isArray(availability)) {
    res.status(400);
    throw new Error("Availability must be an array of schedule slots");
  }

  const user = await User.findById(req.user._id);
  user.availability = availability;
  await user.save();
  res.json({ success: true, availability: user.availability });
});

// @desc  Update own profile (name, phone, bio, etc.)
// @route PUT /api/users/profile
const updateProfile = asyncHandler(async (req, res) => {
  const editableFields = [
    "name",
    "phone",
    "dateOfBirth",
    "gender",
    "avatarUrl",
    "bio",
    "specialization",
    "yearsOfExperience",
    "consultationFee",
  ];
  const user = await User.findById(req.user._id);
  editableFields.forEach((field) => {
    if (req.body[field] !== undefined) user[field] = req.body[field];
  });
  await user.save();
  res.json({ success: true, user });
});

module.exports = { listDoctors, getDoctor, updateAvailability, updateProfile };
