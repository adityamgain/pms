const express = require("express");
const { generateTimesheet } = require("../controllers/timesheetController");

const router = express.Router();

router.get("/download-timesheet", generateTimesheet);

module.exports = router;
