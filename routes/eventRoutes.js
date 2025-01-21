const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const upload = require('../middleware/upload'); // Assuming you have an upload middleware for handling file uploads

// Route to render the event form
router.get('/eventb', eventController.renderEventForm);

// Route to handle event form submission
router.post('/submit-event', upload.fields([{ name: 'photographs' }, { name: 'reports' }]), eventController.submitEvent);

// Route to view the saved event data
router.get('/vieweventb', eventController.viewEventData);

module.exports = router;
