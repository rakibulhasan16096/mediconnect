const express = require("express");
const {
  listDoctors,
  getDoctor,
  updateAvailability,
  updateProfile,
} = require("../controllers/userController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/doctors", protect, listDoctors);
router.get("/doctors/:id", protect, getDoctor);
router.put("/availability", protect, authorize("doctor"), updateAvailability);
router.put("/profile", protect, updateProfile);

module.exports = router;
