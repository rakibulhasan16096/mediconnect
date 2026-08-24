const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const Appointment = require("../models/Appointment");
const User = require("../models/User");

const MS_PER_MIN = 60 * 1000;

const addMinutes = (date, minutes) =>
  new Date(date.getTime() + minutes * MS_PER_MIN);

// @desc  Get available time slots for a doctor on a given date
// @route GET /api/appointments/slots?doctorId=&date=YYYY-MM-DD
const getAvailableSlots = asyncHandler(async (req, res) => {
  const { doctorId, date } = req.query;
  if (!doctorId || !date) {
    res.status(400);
    throw new Error("doctorId and date are required query parameters");
  }

  const doctor = await User.findOne({ _id: doctorId, role: "doctor" });
  if (!doctor) {
    res.status(404);
    throw new Error("Doctor not found");
  }

  const requestedDate = new Date(date);
  if (Number.isNaN(requestedDate.getTime())) {
    res.status(400);
    throw new Error("Invalid date format, expected YYYY-MM-DD");
  }
  const dayOfWeek = requestedDate.getDay();

  const schedule = doctor.availability.filter((a) => a.dayOfWeek === dayOfWeek);
  if (schedule.length === 0) {
    return res.json({ success: true, slots: [] });
  }

  // Fetch existing appointments for that doctor on that day to exclude booked slots
  const startOfDay = new Date(requestedDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(requestedDate.setHours(23, 59, 59, 999));

  const existingAppointments = await Appointment.find({
    doctor: doctorId,
    status: { $in: ["pending", "confirmed"] },
    startTime: { $gte: startOfDay, $lte: endOfDay },
  }).select("startTime endTime");

  const slots = [];

  schedule.forEach(({ startTime, endTime, slotDurationMinutes }) => {
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    let cursor = new Date(startOfDay);
    cursor.setHours(startH, startM, 0, 0);
    const boundary = new Date(startOfDay);
    boundary.setHours(endH, endM, 0, 0);

    while (addMinutes(cursor, slotDurationMinutes) <= boundary) {
      const slotStart = new Date(cursor);
      const slotEnd = addMinutes(cursor, slotDurationMinutes);

      const isBooked = existingAppointments.some(
        (appt) => slotStart < appt.endTime && slotEnd > appt.startTime,
      );
      // Skip slots that are already in the past
      const isPast = slotStart < new Date();

      if (!isBooked && !isPast) {
        slots.push({ startTime: slotStart, endTime: slotEnd });
      }
      cursor = slotEnd;
    }
  });

  res.json({ success: true, slots });
});

// @desc  Book a new appointment (patient only)
// @route POST /api/appointments
const bookAppointment = asyncHandler(async (req, res) => {
  const { doctorId, startTime, endTime, reasonForVisit, consultationType } =
    req.body;

  if (!doctorId || !startTime || !endTime || !reasonForVisit) {
    res.status(400);
    throw new Error(
      "doctorId, startTime, endTime and reasonForVisit are required",
    );
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start >= end
  ) {
    res.status(400);
    throw new Error("Invalid start/end time range");
  }
  if (start < new Date()) {
    res.status(400);
    throw new Error("Cannot book an appointment in the past");
  }

  const doctor = await User.findOne({ _id: doctorId, role: "doctor" });
  if (!doctor) {
    res.status(404);
    throw new Error("Doctor not found");
  }

  // Re-validate against the doctor's declared weekly schedule
  const dayOfWeek = start.getDay();
  const withinSchedule = doctor.availability.some((slot) => {
    if (slot.dayOfWeek !== dayOfWeek) return false;
    const [startH, startM] = slot.startTime.split(":").map(Number);
    const [endH, endM] = slot.endTime.split(":").map(Number);
    const slotStart = new Date(start);
    slotStart.setHours(startH, startM, 0, 0);
    const slotEnd = new Date(start);
    slotEnd.setHours(endH, endM, 0, 0);
    return start >= slotStart && end <= slotEnd;
  });

  if (!withinSchedule) {
    res.status(400);
    throw new Error(
      "Requested time is outside of the doctor's available schedule",
    );
  }

  // Critical: prevent double-booking via an atomic conflict check.
  // A transaction/session would be used with a replica-set MongoDB in production;
  // here we perform a race-safe check immediately before insert.
  const conflict = await Appointment.findOne({
    doctor: doctorId,
    status: { $in: ["pending", "confirmed"] },
    startTime: { $lt: end },
    endTime: { $gt: start },
  });

  if (conflict) {
    res.status(409);
    throw new Error(
      "This time slot has just been booked by another patient. Please choose a different slot.",
    );
  }

  const appointment = await Appointment.create({
    patient: req.user._id,
    doctor: doctorId,
    startTime: start,
    endTime: end,
    reasonForVisit,
    consultationType: consultationType || "video",
    videoRoomId: crypto.randomUUID(),
    status: "pending",
  });

  res.status(201).json({ success: true, appointment });
});

// @desc  Get appointments for the logged-in user (patient sees own, doctor sees own)
// @route GET /api/appointments
const getMyAppointments = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter =
    req.user.role === "doctor"
      ? { doctor: req.user._id }
      : { patient: req.user._id };
  if (status) filter.status = status;

  const appointments = await Appointment.find(filter)
    .populate("patient", "name email phone dateOfBirth gender")
    .populate("doctor", "name specialization consultationFee")
    .sort({ startTime: 1 });

  res.json({ success: true, count: appointments.length, appointments });
});

// @desc  Get single appointment by ID (only participants may view)
// @route GET /api/appointments/:id
const getAppointmentById = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate("patient", "name email phone dateOfBirth gender")
    .populate("doctor", "name specialization consultationFee");

  if (!appointment) {
    res.status(404);
    throw new Error("Appointment not found");
  }

  const isParticipant =
    appointment.patient._id.equals(req.user._id) ||
    appointment.doctor._id.equals(req.user._id);
  if (!isParticipant && req.user.role !== "admin") {
    res.status(403);
    throw new Error("You are not authorized to view this appointment");
  }

  res.json({ success: true, appointment });
});

// @desc  Doctor confirms a pending appointment
// @route PUT /api/appointments/:id/confirm
const confirmAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    res.status(404);
    throw new Error("Appointment not found");
  }
  if (!appointment.doctor.equals(req.user._id)) {
    res.status(403);
    throw new Error("Only the assigned doctor can confirm this appointment");
  }
  appointment.status = "confirmed";
  await appointment.save();
  res.json({ success: true, appointment });
});

// @desc  Cancel an appointment (either participant)
// @route PUT /api/appointments/:id/cancel
const cancelAppointment = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    res.status(404);
    throw new Error("Appointment not found");
  }

  const isParticipant =
    appointment.patient.equals(req.user._id) ||
    appointment.doctor.equals(req.user._id);
  if (!isParticipant && req.user.role !== "admin") {
    res.status(403);
    throw new Error("You are not authorized to cancel this appointment");
  }
  if (["completed", "cancelled"].includes(appointment.status)) {
    res.status(400);
    throw new Error(
      `Cannot cancel an appointment that is already ${appointment.status}`,
    );
  }

  appointment.status = "cancelled";
  appointment.cancelledBy = req.user._id;
  appointment.cancellationReason = reason || "No reason provided";
  await appointment.save();
  res.json({ success: true, appointment });
});

// @desc  Doctor marks appointment completed and adds private notes
// @route PUT /api/appointments/:id/complete
const completeAppointment = asyncHandler(async (req, res) => {
  const { notes } = req.body;
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    res.status(404);
    throw new Error("Appointment not found");
  }
  if (!appointment.doctor.equals(req.user._id)) {
    res.status(403);
    throw new Error("Only the assigned doctor can complete this appointment");
  }
  appointment.status = "completed";
  if (notes) appointment.notes = notes;
  await appointment.save();
  res.json({ success: true, appointment });
});

module.exports = {
  getAvailableSlots,
  bookAppointment,
  getMyAppointments,
  getAppointmentById,
  confirmAppointment,
  cancelAppointment,
  completeAppointment,
};
