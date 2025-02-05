const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

// Render the form to create a new project
router.get('/createProject', projectController.renderCreateProjectForm);

// Handle form submission to create a new project
router.post('/createProject', projectController.createProject);

// Display all projects
router.get('/view-projects', projectController.viewProjects);

// Display project details
router.get('/:id', projectController.getProjectDetails);

// Delete a project
router.delete('/:id', projectController.deleteProject);

// Route to export project details to Excel
router.get('/:id/export', projectController.exportProjectDetails);


module.exports = router;