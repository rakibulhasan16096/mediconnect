const mongoose = require("mongoose");

const medicationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    dosage: { type: String, required: true }, // e.g. "500mg"
    frequency: { type: String, required: true }, // e.g. "twice daily"
    durationDays: { type: Number, required: true },
    instructions: { type: String },
  },
  { _id: false },
);

const prescriptionSchema = new mongoose.Schema(
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
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
    diagnosis: { type: String, required: true },
    medications: { type: [medicationSchema], required: true },
    additionalNotes: { type: String },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },
    issuedAt: { type: Date, default: Date.now },
    // Basic e-prescription integrity: doctor "signs" digitally with a hash
    digitalSignature: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Prescription", prescriptionSchema);
