const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const Prescription = require("../models/Prescription");
const Appointment = require("../models/Appointment");

// @desc  Doctor issues a new e-prescription
// @route POST /api/prescriptions
const createPrescription = asyncHandler(async (req, res) => {
  const { patientId, appointmentId, diagnosis, medications, additionalNotes } =
    req.body;

  if (
    !patientId ||
    !diagnosis ||
    !Array.isArray(medications) ||
    medications.length === 0
  ) {
    res.status(400);
    throw new Error(
      "patientId, diagnosis, and at least one medication are required",
    );
  }

  if (appointmentId) {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      res.status(404);
      throw new Error("Referenced appointment not found");
    }
    if (!appointment.doctor.equals(req.user._id)) {
      res.status(403);
      throw new Error(
        "You may only issue prescriptions for your own appointments",
      );
    }
  }

  // Simple integrity signature: hash of prescribing doctor + timestamp + content
  const signaturePayload = JSON.stringify({
    doctor: req.user._id,
    patientId,
    diagnosis,
    medications,
    ts: Date.now(),
  });
  const digitalSignature = crypto
    .createHash("sha256")
    .update(signaturePayload)
    .digest("hex");

  const prescription = await Prescription.create({
    patient: patientId,
    doctor: req.user._id,
    appointment: appointmentId,
    diagnosis,
    medications,
    additionalNotes,
    digitalSignature,
  });

  res.status(201).json({ success: true, prescription });
});

// @desc  Get prescriptions (patient sees own, doctor sees ones they issued)
// @route GET /api/prescriptions
const getMyPrescriptions = asyncHandler(async (req, res) => {
  const filter =
    req.user.role === "doctor"
      ? { doctor: req.user._id }
      : { patient: req.user._id };
  const prescriptions = await Prescription.find(filter)
    .populate("patient", "name email dateOfBirth")
    .populate("doctor", "name specialization")
    .sort({ issuedAt: -1 });

  res.json({ success: true, count: prescriptions.length, prescriptions });
});

// @desc  Get single prescription (only patient, prescribing doctor, or admin)
// @route GET /api/prescriptions/:id
const getPrescriptionById = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id)
    .populate("patient", "name email dateOfBirth")
    .populate("doctor", "name specialization licenseNumber");

  if (!prescription) {
    res.status(404);
    throw new Error("Prescription not found");
  }

  const isParticipant =
    prescription.patient._id.equals(req.user._id) ||
    prescription.doctor._id.equals(req.user._id);
  if (!isParticipant && req.user.role !== "admin") {
    res.status(403);
    throw new Error("You are not authorized to view this prescription");
  }

  res.json({ success: true, prescription });
});

// @desc  Doctor cancels/revokes a prescription
// @route PUT /api/prescriptions/:id/cancel
const cancelPrescription = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id);
  if (!prescription) {
    res.status(404);
    throw new Error("Prescription not found");
  }
  if (!prescription.doctor.equals(req.user._id)) {
    res.status(403);
    throw new Error("Only the issuing doctor can cancel this prescription");
  }
  prescription.status = "cancelled";
  await prescription.save();
  res.json({ success: true, prescription });
});

module.exports = {
  createPrescription,
  getMyPrescriptions,
  getPrescriptionById,
  cancelPrescription,
};
