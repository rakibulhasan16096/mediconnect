const asyncHandler = require("express-async-handler");
const MedicalRecord = require("../models/MedicalRecord");
const User = require("../models/User");

// @desc  Doctor adds a medical record entry for a patient
// @route POST /api/medical-records
const createRecord = asyncHandler(async (req, res) => {
  const { patientId, appointmentId, type, title, description, attachments } =
    req.body;

  if (!patientId || !title || !description) {
    res.status(400);
    throw new Error("patientId, title and description are required");
  }

  const patient = await User.findOne({ _id: patientId, role: "patient" });
  if (!patient) {
    res.status(404);
    throw new Error("Patient not found");
  }

  const record = await MedicalRecord.create({
    patient: patientId,
    createdBy: req.user._id,
    appointment: appointmentId,
    type: type || "note",
    title,
    description,
    attachments,
  });

  res.status(201).json({ success: true, record });
});

// @desc  Get medical history for a patient
//        - patients can view their own
//        - doctors can view any patient's history (assumes prior consult relationship)
// @route GET /api/medical-records/:patientId
const getPatientHistory = asyncHandler(async (req, res) => {
  const { patientId } = req.params;

  if (req.user.role === "patient" && req.user._id.toString() !== patientId) {
    res.status(403);
    throw new Error("Patients may only view their own medical history");
  }

  const records = await MedicalRecord.find({ patient: patientId })
    .populate("createdBy", "name specialization")
    .sort({ recordedAt: -1 });

  res.json({ success: true, count: records.length, records });
});

// @desc  Update a medical record entry (only the creating doctor)
// @route PUT /api/medical-records/:id
const updateRecord = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findById(req.params.id);
  if (!record) {
    res.status(404);
    throw new Error("Medical record not found");
  }
  if (!record.createdBy.equals(req.user._id)) {
    res.status(403);
    throw new Error("Only the doctor who created this record may edit it");
  }

  const editableFields = ["type", "title", "description", "attachments"];
  editableFields.forEach((field) => {
    if (req.body[field] !== undefined) record[field] = req.body[field];
  });
  await record.save();
  res.json({ success: true, record });
});

module.exports = { createRecord, getPatientHistory, updateRecord };
