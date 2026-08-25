const express = require("express");
const {
  getAvailableSlots,
  bookAppointment,
  getMyAppointments,
  getAppointmentById,
  confirmAppointment,
  cancelAppointment,
  completeAppointment,
} = require("../controllers/appointmentController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/slots", protect, getAvailableSlots);
router.post("/", protect, authorize("patient"), bookAppointment);
router.get("/", protect, getMyAppointments);
router.get("/:id", protect, getAppointmentById);
router.put("/:id/confirm", protect, authorize("doctor"), confirmAppointment);
router.put("/:id/cancel", protect, cancelAppointment);
router.put("/:id/complete", protect, authorize("doctor"), completeAppointment);

module.exports = router;
