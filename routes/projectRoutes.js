const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const EventWbenificiary = require('../models/EventWbenificiary');


// Render the form to create a new project
router.get('/createProject', (req, res) => {
    res.render('create-project');
});

// Handle form submission to create a new project
router.post('/createProject', async (req, res) => {
    try {
        // Validate the input data
        const { projectName, donor, stakeholders, startDate, endDate, areaOfAction, reportingPeriod } = req.body;

        if (!projectName || !donor || !startDate || !endDate || !areaOfAction || !reportingPeriod) {
            return res.status(400).send('Missing required fields');
        }

        // Check if end date is after start date
        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).send('End date must be greater than or equal to start date');
        }

        // Ensure areaOfAction is an array
        const areaOfActionArray = Array.isArray(areaOfAction) ? areaOfAction : [areaOfAction];

        // Create a new project
        const project = new Project({
            projectName,
            donor,
            stakeholders: stakeholders.split(',').map(s => s.trim()),
            startDate,
            endDate,
            areaOfAction: areaOfActionArray,
            reportingPeriod
        });

        await project.save();

        // Redirect to the newly created project's page
        res.redirect(`/projects/${project._id}`);
    } catch (err) {
        console.error('Error saving project:', err);
        res.status(500).send('Error saving project');
    }
});

// Display all projects
router.get('/view-projects', async (req, res) => {
    try {
        const projects = await Project.find(); 
        res.render('viewProjects', { projects }); 
    } catch (err) {
        console.error('Error fetching projects:', err);
        res.status(500).send('Error fetching projects');
    }
});

// Display project details
router.get('/:id', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
    
        if (!project) {
            return res.status(404).send('Project not found');
        }
    
        // Count the number of events associated with the project
        const totalEvents = await EventWbenificiary.countDocuments({ _id: { $in: project.events } });
    
        res.render('project-details', { project, totalEvents });
    } catch (err) {
        console.error('Error fetching project:', err);
        res.status(500).send('Error fetching project');
    }
});



module.exports = router;