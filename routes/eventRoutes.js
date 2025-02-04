const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const upload = require('../middleware/upload'); // Assuming you have an upload middleware for handling file uploads

// Route for rendering the event form
router.get('/projects/:projectId/eventb', eventController.renderEventForm);

// Route to handle event form submission
router.post('/projects/:projectId/submit-event', upload.fields([{ name: 'photographs', maxCount: 5 }, { name: 'reports', maxCount: 5 }, { name: 'beneficiariesFile', maxCount: 1 }]), eventController.submitEvent);

// Route to display the edit form for a specific event
router.get('/events/:id/edit', eventController.showEditForm);

// Route to handle the update of a specific event
router.post('/events/:id/edit', upload.fields([{ name: 'photographs', maxCount: 5 }, { name: 'reports', maxCount: 5 }]), eventController.updateEvent);

// Delete event
router.get('/events/delete/:id', eventController.deleteEvent);

// Route to handle the deletion of a specific event
// router.post('/events/:id/delete', eventController.deleteEvent);

// Route to view the saved event data
router.get('/projects/:projectId/event-list', eventController.viewAllEventData);

// Route to view the saved event data
router.get('/viewevent/:id', eventController.viewOneEventData);

// Route to view the saved event data
router.get('/vieweventb', eventController.viewEventData);

module.exports = router;
