const mongoose = require("mongoose");

const medicalRecordSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // doctor
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
    type: {
      type: String,
      enum: [
        "diagnosis",
        "lab_result",
        "allergy",
        "vaccination",
        "surgery",
        "note",
      ],
      default: "note",
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    attachments: [{ url: String, filename: String }],
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

medicalRecordSchema.index({ patient: 1, recordedAt: -1 });

module.exports = mongoose.model("MedicalRecord", medicalRecordSchema);
