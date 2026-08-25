const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    reasonForVisit: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed", "no_show"],
      default: "pending",
    },
    consultationType: {
      type: String,
      enum: ["video", "in_person"],
      default: "video",
    },
    videoRoomId: { type: String }, // unique room used for WebRTC signaling
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    cancellationReason: { type: String },
    notes: { type: String }, // doctor's private notes after the visit
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Prevent double-booking the same doctor for overlapping slots
appointmentSchema.index({ doctor: 1, startTime: 1, endTime: 1 });
appointmentSchema.index({ patient: 1, startTime: 1 });

module.exports = mongoose.model("Appointment", appointmentSchema);
