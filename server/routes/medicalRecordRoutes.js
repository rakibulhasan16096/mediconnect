const express = require("express");
const {
  createRecord,
  getPatientHistory,
  updateRecord,
} = require("../controllers/medicalRecordController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/", protect, authorize("doctor"), createRecord);
router.get("/:patientId", protect, getPatientHistory);
router.put("/:id", protect, authorize("doctor"), updateRecord);

module.exports = router;
