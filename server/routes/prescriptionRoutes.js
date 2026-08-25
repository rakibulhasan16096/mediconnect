const express = require("express");
const {
  createPrescription,
  getMyPrescriptions,
  getPrescriptionById,
  cancelPrescription,
} = require("../controllers/prescriptionController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/", protect, authorize("doctor"), createPrescription);
router.get("/", protect, getMyPrescriptions);
router.get("/:id", protect, getPrescriptionById);
router.put("/:id/cancel", protect, authorize("doctor"), cancelPrescription);

module.exports = router;
