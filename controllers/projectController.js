const fs = require('fs').promises;
const Project = require('../models/Project');
const EventWbenificiary = require('../models/EventWbenificiary');
const xlsx = require('xlsx');

let projectCounter = 1; // Initialize a counter for project code names

// Function to generate a short and easy-to-remember code name
function generateCodeName() {
    const prefix = 'PC';
    const uniqueNumber = projectCounter++;
    return `${prefix}-${uniqueNumber}`;
}

// Render the form to create a new project
exports.renderCreateProjectForm = (req, res) => {
    res.render('create-project');
};

// Handle form submission to create a new project
exports.createProject = async (req, res) => {
    try {
        const { projectName, donor, stakeholders, startDate, endDate, areaOfAction, reportingPeriod, activities: rawActivities } = req.body;

        // Validate required fields
        if (!projectName || !donor || !startDate || !endDate || !areaOfAction || !reportingPeriod) {
            return res.status(400).send('Missing required fields');
        }

        // Ensure start date is before end date
        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).send('End date must be greater than or equal to start date');
        }

        // Ensure activities is an array before mapping
        if (!Array.isArray(rawActivities)) {
            return res.status(400).send('Activities must be an array');
        }

        // Validate each activity
        const activities = rawActivities.map((activity) => {
            if (!activity.name || typeof activity.name !== "string") {
                throw new Error("Each activity must have a valid name (string).");
            }
            return {
                name: activity.name,
                outcomes: Array.isArray(activity.outcomes) ? activity.outcomes : [],
            };
        });

        // Ensure areaOfAction is an array
        const areaOfActionArray = Array.isArray(areaOfAction) ? areaOfAction : [areaOfAction];

        // Ensure stakeholders is an array
        const stakeholdersArray = Array.isArray(stakeholders) ? stakeholders : stakeholders.split(',').map(s => s.trim());

        // Generate unique project code
        const codeName = generateCodeName();

        // Create project object
        const project = new Project({
            projectName,
            donor,
            stakeholders: stakeholdersArray,
            startDate,
            endDate,
            areaOfAction: areaOfActionArray,
            reportingPeriod,
            codeName,
            activities
        });

        // Save project
        await project.save();
        res.redirect(`/projects/${project._id}`);
    } catch (err) {
        console.error('Error saving project:', err.message);
        res.status(500).send(err.message || 'Error saving project');
    }
};

// Display all projects
exports.viewProjects = async (req, res) => {
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
};

// Display project details
exports.getProjectDetails = async (req, res) => {
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
};


// Delete a project and its associated events
exports.deleteProject = async (req, res) => {
    try {
        const projectId = req.params.id;
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).send('Project not found.');
        }
        const events = await EventWbenificiary.find({ _id: { $in: project.events } });
        if (events.length > 0) {
            for (const event of events) {
                if (event.photographs?.length) {
                    await Promise.all(event.photographs.map(async (photoPath) => {
                        try {
                            await fs.unlink(photoPath);
                        } catch (error) {
                            console.error(`Error deleting photograph: ${photoPath}`, error.message);
                        }
                    }));
                }
                if (event.reports?.length) {
                    await Promise.all(event.reports.map(async (reportPath) => {
                        try {
                            await fs.unlink(reportPath);
                        } catch (error) {
                            console.error(`Error deleting report: ${reportPath}`, error.message);
                        }
                    }));
                }
            }
            await EventWbenificiary.deleteMany({ _id: { $in: project.events } });
        }
        await Project.findByIdAndDelete(projectId);
        res.redirect('/projects/view-projects');
    } catch (err) {
        console.error('Error deleting project and events:', err.message);
        res.status(500).send(`Server Error: ${err.message}`);
    }
};

// Export project data to Excel
exports.exportProjectDetails = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id).populate('events');
        if (!project) {
            return res.status(404).send('Project not found');
        }

        const workbook = xlsx.utils.book_new();
        const projectSheetData = [
            ['Project Name', project.projectName],
            ['Donor', project.donor],
            ['Stakeholders', project.stakeholders.join(', ')],
            ['Start Date', project.startDate.toDateString()],
            ['End Date', project.endDate.toDateString()],
            ['Area of Action', project.areaOfAction.join(', ')],
            ['Reporting Period', project.reportingPeriod],
            ['Project Status', project.projectStatus]
        ];
        const projectSheet = xlsx.utils.aoa_to_sheet(projectSheetData);
        xlsx.utils.book_append_sheet(workbook, projectSheet, 'Project Details');

        const beneficiariesSheetData = [
            [
                'SN', 'Year', 'Month', 'Start Date (dd-mm-yyyy)', 'End Date (dd-mm-yyyy)', 
                'Duration (days)', 'Events','Event Outcomes', 'Facilitators', 'National Level', 'Province', 'District', 'Municipality', 
                'Type.Category', 'Linked to Field of Action', 'Beneficiary Name', 'Organization', 
                'Organization Type', 'Gender', 'Age', 'Caste', 'Poverty Status', 'Disability'
            ]
        ];

        let sn = 1;
        for (const event of project.events) {
            const eventYear = event.startDate.getFullYear();
            const eventMonth = event.startDate.toLocaleString('default', { month: 'long' });
            const duration = Math.ceil((event.endDate - event.startDate) / (1000 * 60 * 60 * 24));
            for (const beneficiary of event.beneficiaries) {
                beneficiariesSheetData.push([
                    sn++,
                    eventYear,
                    eventMonth,
                    event.startDate.toLocaleDateString('en-GB'),
                    event.endDate.toLocaleDateString('en-GB'),
                    duration,
                    event.eventName,
                    event.outcome,
                    event.facilitators.join(', '),
                    event.nationalLevel,
                    event.venue.province,
                    event.venue.district,
                    event.venue.municipality,
                    event.eventType,
                    project.areaOfAction.join(', '),
                    beneficiary.name,
                    beneficiary.associatedOrganization.name,
                    beneficiary.associatedOrganization.main,
                    beneficiary.gender,
                    beneficiary.age,
                    beneficiary.casteEthnicity,
                    beneficiary.povertyStatus,
                    beneficiary.disability ? 'Yes' : 'No'
                ]);
            }
        }

        const beneficiariesSheet = xlsx.utils.aoa_to_sheet(beneficiariesSheetData);
        xlsx.utils.book_append_sheet(workbook, beneficiariesSheet, 'Beneficiaries');

        const excelBuffer = xlsx.write(workbook, { type: 'buffer' });
        res.setHeader('Content-Disposition', `attachment; filename=project_${project._id}.xlsx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(excelBuffer);
    } catch (err) {
        console.error('Error exporting project data:', err);
        res.status(500).send('Error exporting project data');
    }
};