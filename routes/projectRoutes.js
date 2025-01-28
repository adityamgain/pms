const express = require('express');
const router = express.Router();
const Project = require('../models/Project');

// Render the form to create a new project
router.get('/createProject', (req, res) => {
    res.render('create-project');
});

// Handle form submission to create a new project
router.post('/createProject', async (req, res) => {
    try {
        const project = new Project(req.body);
        await project.save();
        res.redirect(`/projects/${project._id}`); // Redirect to project details page
    } catch (err) {
        console.error('Error saving project:', err);
        res.status(500).send('Error saving project');
    }
});

// Display all projects
router.get('/view-projects', async (req, res) => {
    try {
        const projects = await Project.find(); // Fetch all projects
        res.render('viewProjects', { projects }); // Render the viewProjects.ejs template
    } catch (err) {
        console.error('Error fetching projects:', err);
        res.status(500).send('Error fetching projects');
    }
});

// Display project details
router.get('/:id', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        res.render('project-details', { project });
    } catch (err) {
        console.error('Error fetching project:', err);
        res.status(500).send('Error fetching project');
    }
});

module.exports = router;