const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const EventWbenificiary = require('../models/EventWbenificiary');


// Render the form to create a new project
router.get('/createProject', (req, res) => {
    res.render('create-project');
});

// Function to generate a short and easy-to-remember code name
let projectCounter = 1; // Initialize a counter for project code names

function generateCodeName() {
    const prefix = 'PC';
    const uniqueNumber = projectCounter++;
    return `${prefix}-${uniqueNumber}`;
}

// Handle form submission to create a new project
router.post('/createProject', async (req, res) => {
    try {
        const { projectName, donor, stakeholders, startDate, endDate, areaOfAction, reportingPeriod } = req.body;
        if (!projectName || !donor || !startDate || !endDate || !areaOfAction || !reportingPeriod) {
            return res.status(400).send('Missing required fields');
        }
        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).send('End date must be greater than or equal to start date');
        }
        const areaOfActionArray = Array.isArray(areaOfAction) ? areaOfAction : [areaOfAction];
        const codeName = generateCodeName();
        const project = new Project({
            projectName,
            donor,
            stakeholders: stakeholders.split(',').map(s => s.trim()),
            startDate,
            endDate,
            areaOfAction: areaOfActionArray,
            reportingPeriod,
            codeName   
        });
        await project.save();
        res.redirect(`/projects/${project._id}`);
    } catch (err) {
        console.error('Error saving project:', err);
        res.status(500).send('Error saving project');
    }
});

// Display all projects
router.get('/view-projects', async (req, res) => {
    try {
        // Fetch all projects
        const projects = await Project.find();

        // Add totalEvents to each project object
        const projectsWithEventCounts = projects.map(project => {
            // Ensure events is an array before calculating its length
            const totalEvents = Array.isArray(project.events) ? project.events.length : 0;

            return {
                ...project.toObject(),
                totalEvents: totalEvents
            };
        });

        res.render('viewProjects', { projects: projectsWithEventCounts });
    } catch (err) {
        console.error('Error fetching projects:', err);
        res.status(500).send('Error fetching projects');
    }
});

// Display project details
router.get('/:id', async (req, res) => {
    try {
        // Fetch the project and populate its events
        const project = await Project.findById(req.params.id).populate('events');

        if (!project) {
            return res.status(404).send('Project not found');
        }

        const totalEvents = project.events.length;
        const eventTypeCounts = {};
        let totalAttendees = 0;
        let totalBenefitted = 0;

        // Aggregate events by type and calculate total attendees and benefitted ratio
        for (const event of project.events) {
            if (event.eventType) { 
                eventTypeCounts[event.eventType] = (eventTypeCounts[event.eventType] || 0) + 1;
            }
            if (event.beneficiaries) {
                totalAttendees += event.beneficiaries.length;
                totalBenefitted += event.beneficiaries.filter(b => b.benefitsFromActivity).length;
            }
        }

        // Calculate the benefitted ratio as a percentage
        const benefittedRatio = totalAttendees > 0 ? (totalBenefitted / totalAttendees) * 100 : 0;

        // Convert the aggregated data into a format suitable for Chart.js
        const eventTypes = Object.keys(eventTypeCounts);
        const eventCounts = Object.values(eventTypeCounts);

        res.render('project-details', {
            project,
            totalEvents,
            totalAttendees,
            totalBenefitted,
            benefittedRatio: benefittedRatio.toFixed(2), // Round to 2 decimal places
            eventTypes: JSON.stringify(eventTypes),
            eventCounts: JSON.stringify(eventCounts)
        });
    } catch (err) {
        console.error('Error fetching project:', err);
        res.status(500).send('Error fetching project');
    }
});


module.exports = router;