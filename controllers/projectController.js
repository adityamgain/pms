const fs = require('fs').promises;
const { Project, EventWbenificiary, Beneficiary } = require('../models');
const xlsx = require('xlsx');
const bcrypt = require('bcrypt');
const ExcelJS = require('exceljs');
const XlsxPopulate = require('xlsx-populate');
// Export project data to Excel



// Render the form to create a new project
exports.renderCreateProjectForm = (req, res) => {
    res.render('create-project');
};


// Generate a unique project code
function generateCodeName() {
  return 'PRJ' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Handle form submission to create a new project
exports.createProject = async (req, res) => {
    try {
      const { projectName, donor, stakeholders, startDate, endDate, areaOfAction, reportingPeriod, activities, outcomes, ...ganttChartInputs } = req.body;
      console.log("Received request body:", req.body);
  
      // Validate required fields
      if (!projectName || !donor || !startDate || !endDate || !areaOfAction || !reportingPeriod) {
        return res.status(400).send('Missing required fields');
      }
  
      // Ensure start date is before end date
      if (new Date(startDate) > new Date(endDate)) {
        return res.status(400).send('End date must be greater than or equal to start date');
      }
  
      // Ensure activities and outcomes are arrays
      const activitiesArray = Array.isArray(activities) ? activities.map(a => a.trim()).filter(a => a) : [];
      const outcomesArray = Array.isArray(outcomes) ? outcomes.map(o => o.trim()).filter(o => o) : [];
  
      // Ensure areaOfAction is an array and matches the validation
      const validAreaOfActions = [
        'Nature-based commercial agriculture',
        'Sustainable Forest Management',
        'Water',
        'Climate Change',
      ];
      const areaOfActionArray = Array.isArray(areaOfAction) ? areaOfAction : [areaOfAction];
      for (const action of areaOfActionArray) {
        if (!validAreaOfActions.includes(action)) {
          return res.status(400).send(`Invalid area of action: ${action}`);
        }
      }
  
      // Ensure stakeholders is an array
      const stakeholdersArray = Array.isArray(stakeholders) ? stakeholders : stakeholders.split(',').map(s => s.trim());
  
      // Generate unique project code
      const codeName = generateCodeName();
  
      const ganttChartData = {};
      // Iterate over the activities within ganttChartInputs.events
      for (const activityName in ganttChartInputs.events) {
        const timeUnitsData = ganttChartInputs.events[activityName]; // Get time unit data for this activity
        ganttChartData[activityName] = {}; // Initialize nested object for the activity
  
        const targetValue = ganttChartInputs.targets?.[activityName] || ""; // Get target for the entire activity
        const unitValue = ganttChartInputs.units?.[activityName] || "person"; // Get unit for the entire activity
  
        ganttChartData[activityName] = {
          target: targetValue,
          unit: unitValue,
          timeUnits: {} // Nested object for time unit event counts
        };
  
        for (const timeUnit in timeUnitsData) {
          const eventCount = timeUnitsData[timeUnit];
          ganttChartData[activityName].timeUnits[timeUnit] = parseInt(eventCount, 10) || 0; // Store event counts under timeUnits
        }
      }
      console.log("ganttChartInputs:", ganttChartInputs);
      console.log("ganttChartData:", ganttChartData);
  
      // Create project object
      const project = await Project.create({
        projectName,
        donor,
        stakeholders: stakeholdersArray,
        startDate,
        endDate,
        areaOfAction: areaOfActionArray,
        reportingPeriod,
        codeName,
        activities: activitiesArray,
        outcomes: outcomesArray,
        ganttChartData: ganttChartData
      });
  
      res.redirect(`/projects/${project.id}`);
    } catch (err) {
      console.error('Error saving project:', err.message);
      res.status(500).send(err.message || 'Error saving project');
    }
  };




// Fetch project details including events and beneficiaries
exports.getProjectDetails = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findByPk(projectId, {
      include: {
        model: EventWbenificiary,
        as: 'events',
        include: {
          model: Beneficiary,
          as: 'beneficiaries'
        }
      }
    });

    if (!project) {
      return res.status(404).send('Project not found');
    }

    res.json(project);
  } catch (err) {
    console.error('Error fetching project:', err.message);
    res.status(500).send(err.message || 'Error fetching project');
  }
};



// Fetch project details including events and beneficiaries
exports.getProjectDetails = async (req, res) => {
    try {
        const { projectId } = req.params;

        const project = await Project.findByPk(projectId, {
            include: {
                model: EventWbenificiary,
                as: 'events',
                include: {
                    model: Beneficiary,
                    as: 'beneficiaries'
                }
            }
        });

        if (!project) {
            return res.status(404).send('Project not found');
        }

        res.json(project);
    } catch (err) {
        console.error('Error fetching project:', err.message);
        res.status(500).send(err.message || 'Error fetching project');
    }
};

// Display all projects
exports.viewProjects = async (req, res) => {
    try {
        // Fetch all projects
        const projects = await Project.findAll();

        // Add totalEvents to each project object
        const projectsWithEventCounts = await Promise.all(projects.map(async project => {
            const totalEvents = await EventWbenificiary.count({ where: { projectId: project.id } });
            return {
                ...project.toJSON(),
                totalEvents
            };
        }));

        res.render('viewProjects', { projects: projectsWithEventCounts });
    } catch (err) {
        console.error('Error fetching projects:', err);
        res.status(500).send('Error fetching projects');
    }
};

// Get project details
exports.getProjectDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { eventType, startDate, endDate, outcome, activity, municipality, district, province } = req.query;

        // Fetch the project by ID and include events and beneficiaries
        const project = await Project.findByPk(id, {
            include: {
                model: EventWbenificiary,
                as: 'events',
                include: { model: Beneficiary, as: 'beneficiaries' }
            }
        });

        if (!project) {
            return res.status(404).send("Project not found");
        }

        // Check and update project status if needed
        const currentDate = new Date();
        if (new Date(project.endDate) < currentDate && project.projectStatus.toLowerCase() !== "completed") {
            await project.update({ projectStatus: "Completed" });
        }

        // --- Define allEvents HERE, right after fetching project ---
        const allEvents = project.events;

        // --- Apply Filters Server-Side ---
        let filteredEvents = allEvents; // Start with all events, then filter
        if (eventType) {
            filteredEvents = filteredEvents.filter(event => event.eventType === eventType);
        }
        if (outcome) {
            filteredEvents = filteredEvents.filter(event => event.outcome === outcome); // Corrected outcome filter
        }
        if (activity) {
            filteredEvents = filteredEvents.filter(event => event.eventName === activity); // Assuming activity filter is on eventName
        }
        if (municipality) {
            filteredEvents = filteredEvents.filter(event => event.venue?.municipality === municipality);
        }
        if (district) {
            filteredEvents = filteredEvents.filter(event => event.venue?.district === district);
        }
        if (province) {
            filteredEvents = filteredEvents.filter(event => event.venue?.province === province);
        }
        if (startDate) {
            const filterStartDate = new Date(startDate);
            filteredEvents = filteredEvents.filter(event => new Date(event.startDate) >= filterStartDate);
        }
        if (endDate) {
            const filterEndDate = new Date(endDate);
            filteredEvents = filteredEvents.filter(event => new Date(event.endDate) <= filterEndDate);
        }

        // Calculate targeted events from ganttChartData
        const ganttChartData = project.ganttChartData;
        let targetedEvents = 0;

        for (const activity in ganttChartData) {
            // Access timeUnits nested object
            const timeUnitsData = ganttChartData[activity].timeUnits;
            if (timeUnitsData) { // Check if timeUnitsData exists to avoid errors
                for (const timeUnit in timeUnitsData) {
                    targetedEvents += timeUnitsData[timeUnit] || 0; // Sum events from timeUnitsData
                }
            }
        }

        function calculateTargetBeneficiary(project) {
            // Calculate target beneficiaries, revenue, and area from ganttChartData
            const ganttChartData = project.ganttChartData;
            let targetBeneficiary = 0;
            let targetRevenue = 0;
            let targetArea = 0;

            for (const activity in ganttChartData) {
                const activityData = ganttChartData[activity];
                const unit = activityData.unit;
                const target = activityData.target;

                if (unit === 'person') {
                    // Parse target to integer, default to 0 if parsing fails or target is empty
                    const targetValue = parseInt(target, 10) || 0;
                    targetBeneficiary += targetValue;
                } else if (unit === 'revenue') {
                    // Parse target to integer, default to 0 if parsing fails or target is empty
                    const targetValue = parseInt(target, 10) || 0;
                    targetRevenue += targetValue;
                } else if (unit === 'area') {
                    // Parse target to integer, default to 0 if parsing fails or target is empty
                    const targetValue = parseInt(target, 10) || 0;
                    targetArea += targetValue;
                }
            }

            return {
                targetBeneficiary: targetBeneficiary,
                targetRevenue: targetRevenue,
                targetArea: targetArea
            };
        }

        const targets = calculateTargetBeneficiary(project);
        const totalTargetBeneficiary = targets.targetBeneficiary;
        const totalTargetRevenue = targets.targetRevenue;
        const totalTargetArea = targets.targetArea;

        // Initialize variables for project statistics (using FILTERED events now)
        const totalEvents = filteredEvents.length; // Use filteredEvents here
        const EventsPercent = project.target_events > 0 ? (totalEvents / project.target_events) * 100 : 0;
        const reportingPeriod = project.reportingPeriod;

        // Initialize event tracking (using FILTERED events now)
        const eventTypeCounts = {};
        const eventTitles = new Set();
        let totalAttendees = 0;
        let totalBenefitted = 0;
        let totalMale = 0, totalFemale = 0, totalOther = 0;
        let totalDalit = 0, totalJanajati = 0, totalBrahminChhetri = 0, totalTharu = 0, totalMadhesi = 0, totalOthers = 0;
        let ageUnder25 = 0, age25to40 = 0, ageAbove40 = 0;

        filteredEvents.forEach(event => { // Use filteredEvents here for stats calculation
            if (event.eventType) {
                eventTypeCounts[event.eventType] = (eventTypeCounts[event.eventType] || 0) + 1;
            }
            if (Array.isArray(event.beneficiaries)) {
                totalAttendees += event.beneficiaries.length;
                totalBenefitted += event.beneficiaries.filter(b => b.benefitsFromActivity).length;
                event.beneficiaries.forEach(beneficiary => {
                    if (beneficiary.gender === "Male") totalMale++;
                    else if (beneficiary.gender === "Female") totalFemale++;
                    else if (beneficiary.gender === "Other") totalOther++;
                    switch (beneficiary.casteEthnicity) {
                        case "Dalit": totalDalit++; break;
                        case "Janajati": totalJanajati++; break;
                        case "Brahman/Chhetri": totalBrahminChhetri++; break;
                        case "Tharu": totalTharu++; break;
                        case "Madhesi": totalMadhesi++; break;
                        case "Others": totalOthers++; break;
                    }
                    switch (beneficiary.age) {
                        case "Upto 25 years": ageUnder25++; break;
                        case "25-40 years": age25to40++; break;
                        case "40 above years": ageAbove40++; break;
                    }
                });
            }
        });

        const benefittedRatio = totalAttendees > 0 ? (totalBenefitted / totalAttendees) * 100 : 0;
        const eventTypes = Object.keys(eventTypeCounts);
        const eventCounts = Object.values(eventTypeCounts);
        const reportingPeriodStart = new Date(project.startDate);
        const reportingPeriodEnd = new Date(project.endDate);
        if (isNaN(reportingPeriodStart.getTime()) || isNaN(reportingPeriodEnd.getTime())) {
            return res.status(400).send("Invalid project start or end date");
        }

        const uniqueOutcomes = [...new Set(allEvents.flatMap(event => event.outcome || []))];
        const uniqueActivities = [...new Set(allEvents.map(e => e.eventName).filter(Boolean))];
        const uniquemunicipality = [...new Set(allEvents.map(e => e.venue?.municipality).filter(Boolean))];
        const uniqueDistricts = [...new Set(allEvents.map(e => e.venue?.district).filter(Boolean))];
        const uniqueProvinces = [...new Set(allEvents.map(e => e.venue?.province).filter(Boolean))];
        const uniqueEventTypes = [...new Set(allEvents.map(e => e.eventType).filter(Boolean))]; // Add unique event types

        // --- Prepare eventLocations based on FILTERED events ---
        const eventLocations = filteredEvents
            .filter(event => event.location && event.location.coordinates)
            .map(event => ({
                coordinates: event.location.coordinates,
                venue: event.venue,
                eventName: event.eventName
            }));

        res.render("project-details", {
            project,
            EventsPercent: EventsPercent.toFixed(1),
            totalEvents,
            totalAttendees,
            totalBenefitted,
            targetedEvents,
            totalTargetBeneficiary,
            totalTargetRevenue,
            totalTargetArea,
            benefittedRatio: benefittedRatio.toFixed(2),
            eventTypes: JSON.stringify(eventTypes),
            eventCounts: JSON.stringify(eventCounts),
            eventTitles: JSON.stringify([...eventTitles]),
            ganttData: JSON.stringify( /* ganttData - you might recalculate this on client if needed based on filters */ []), // Gantt is complex to filter client-side, leave for now or filter on client too
            reportingPeriodStart: reportingPeriodStart.toISOString(),
            reportingPeriodEnd: reportingPeriodEnd.toISOString(),
            reportingPeriod,

            totalMale,
            totalFemale,
            totalOther,

            totalDalit,
            totalJanajati,
            totalBrahminChhetri,
            totalTharu,
            totalMadhesi,
            totalOthers,

            ageUnder25,
            age25to40,
            ageAbove40,

            filters: { eventType, startDate, endDate, outcome, activity, municipality, district, province }, // Keep filters for other potential uses
            uniqueOutcomes,
            uniqueActivities,
            uniquemunicipality,
            uniqueDistricts,
            uniqueProvinces,
            uniqueEventTypes, // Pass unique event types for filter
            eventLocations: eventLocations, // Pass FILTERED eventLocations
            allEvents: JSON.stringify(allEvents), // Still pass all events for client-side chart filtering if you keep it
            clientFilteredEvents: JSON.stringify(filteredEvents) // Pass filtered events for client-side if needed for charts
        });
    } catch (err) {
        console.error("Error fetching project:", err);
        res.status(500).send("Error fetching project");
    }
};

// Delete a project and its associated events
exports.deleteProject = async (req, res) => {
    try {
        const projectId = req.params.id;
        const project = await Project.findByPk(projectId);
        if (!project) {
            return res.status(404).send('Project not found.');
        }
        const events = await EventWbenificiary.findAll({ where: { projectId: project.id } });
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
            await EventWbenificiary.destroy({ where: { projectId: project.id } });
        }
        await Project.destroy({ where: { id: projectId } });
        res.redirect('/projects/view-projects');
    } catch (err) {
        console.error('Error deleting project and events:', err.message);
        res.status(500).send(`Server Error: ${err.message}`);
    }
};




// Export project data to Excel
exports.exportProjectDetails = async (req, res) => {
    try {
        const project = await Project.findByPk(req.params.id, {
            include: {
                model: EventWbenificiary,
                as: 'events',
                include: { model: Beneficiary, as: 'beneficiaries' }
            }
        });

        if (!project) {
            return res.status(404).send('Project not found');
        }

        const workbook = xlsx.utils.book_new();

        // Project Details Sheet
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

        // Beneficiaries Sheet
        const beneficiariesSheetData = [
            [
                'SN', 'Year', 'Month', 'Start Date (dd-mm-yyyy)', 'End Date (dd-mm-yyyy)', 
                'Duration (days)', 'Events', 'Event Outcomes', 'Facilitators', 'National Level', 'Province', 'District', 'Municipality', 
                'Type.Category', 'Linked to Field of Action', 'Beneficiary Name', 'Organization', 
                'Organization Type', 'Gender', 'Age', 'Caste', 'Poverty Status', 'Disability'
            ]
        ];

        const eventSummaryData = [
            [
                'SN', 'Year', 'Month', 'Start Date (dd-mm-yyyy)', 'End Date (dd-mm-yyyy)', 'Duration (days)', 'Events', 'Event Outcomes', 
                'Facilitators', 'National Level', 'Province', 'District', 'Municipality', 'Type.Category', 'Linked to Field of Action',
                'Total Attendees', 'Total Male', 'Total Female', 'Total 25 Yrs', 'Total 25-40 Yrs', 'Total 40 Above', 'Total Benefitted', 'Total Disability',
                'Total Dalit', 'Total Tharu', 'Total Janajati', 'Total Brahman/Chhetri', 'Total Madhesi', 'Total Others Caste', 'Total Poverty A', 'Total Poverty B', 'Total Poverty C', 'Total Poverty D'
            ]
        ];

        let sn = 1;
        let eventSn = 1;
        const overview = {
            totalAttendees: 0,
            totalMale: 0,
            totalFemale: 0,
            totalOrganizations: 0,
            totalUpto25: 0,
            total25To40: 0,
            totalabove40: 0,
            totalBenefitted: 0,
            totalDisability: 0,
            totalDalit: 0,
            totalTharu: 0,
            totalJanajati: 0,
            totalBrahmanChhetri: 0,
            totalMadhesi: 0,
            totalOthersCaste: 0,
            totalPovertyA: 0,
            totalPovertyB: 0,
            totalPovertyC: 0,
            totalPovertyD: 0
        };

        for (const event of project.events) {
            const eventYear = event.startDate.getFullYear();
            const eventMonth = event.startDate.toLocaleString('default', { month: 'long' });
            const duration = Math.ceil((event.endDate - event.startDate) / (1000 * 60 * 60 * 24));
            let totalMale = 0, totalFemale = 0, totalUpto25 = 0, total25To40 = 0, totalabove40 = 0, totalBenefitted = 0, totalDisability = 0;
            let totalDalit = 0, totalTharu = 0, totalJanajati = 0, totalBrahmanChhetri = 0, totalMadhesi = 0, totalOthersCaste = 0;
            let totalPovertyA = 0, totalPovertyB = 0, totalPovertyC = 0, totalPovertyD = 0;

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

                // Update overview and event summary data
                overview.totalAttendees++;
                totalMale += beneficiary.gender === 'Male' ? 1 : 0;
                totalFemale += beneficiary.gender === 'Female' ? 1 : 0;
                totalUpto25 += beneficiary.age === 'Upto 25 years' ? 1 : 0;
                total25To40 += beneficiary.age === '25-40 years' ? 1 : 0;
                totalabove40 += beneficiary.age === 'Above 40 years' ? 1 : 0;
                totalBenefitted += beneficiary.benefitsFromActivity ? 1 : 0;
                totalDisability += beneficiary.disability ? 1 : 0;
                totalDalit += beneficiary.casteEthnicity === 'Dalit' ? 1 : 0;
                totalTharu += beneficiary.casteEthnicity === 'Tharu' ? 1 : 0;
                totalJanajati += beneficiary.casteEthnicity === 'Janajati' ? 1 : 0;
                totalBrahmanChhetri += beneficiary.casteEthnicity === 'Brahman/Chhetri' ? 1 : 0;
                totalMadhesi += beneficiary.casteEthnicity === 'Madhesi' ? 1 : 0;
                totalOthersCaste += !['Dalit', 'Tharu', 'Janajati', 'Brahman/Chhetri', 'Madhesi'].includes(beneficiary.casteEthnicity) ? 1 : 0;
                totalPovertyA += beneficiary.povertyStatus === 'A' ? 1 : 0;
                totalPovertyB += beneficiary.povertyStatus === 'B' ? 1 : 0;
                totalPovertyC += beneficiary.povertyStatus === 'C' ? 1 : 0;
                totalPovertyD += beneficiary.povertyStatus === 'D' ? 1 : 0;
            }

            eventSummaryData.push([
                eventSn++,
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
                event.beneficiaries.length,
                totalMale,
                totalFemale,
                totalUpto25,
                total25To40,
                totalabove40,
                totalBenefitted,
                totalDisability,
                totalDalit,
                totalTharu,
                totalJanajati,
                totalBrahmanChhetri,
                totalMadhesi,
                totalOthersCaste,
                totalPovertyA,
                totalPovertyB,
                totalPovertyC,
                totalPovertyD
            ]);

            // Update overall overview data
            overview.totalMale += totalMale;
            overview.totalFemale += totalFemale;
            overview.totalUpto25 += totalUpto25;
            overview.total25To40 += total25To40;
            overview.totalabove40 += totalabove40;
            overview.totalBenefitted += totalBenefitted;
            overview.totalDisability += totalDisability;
            overview.totalDalit += totalDalit;
            overview.totalTharu += totalTharu;
            overview.totalJanajati += totalJanajati;
            overview.totalBrahmanChhetri += totalBrahmanChhetri;
            overview.totalMadhesi += totalMadhesi;
            overview.totalOthersCaste += totalOthersCaste;
            overview.totalPovertyA += totalPovertyA;
            overview.totalPovertyB += totalPovertyB;
            overview.totalPovertyC += totalPovertyC;
            overview.totalPovertyD += totalPovertyD;
        }

        const beneficiariesSheet = xlsx.utils.aoa_to_sheet(beneficiariesSheetData);
        xlsx.utils.book_append_sheet(workbook, beneficiariesSheet, 'Beneficiaries');

        const summarySheetData = [
            ['Total Attendees', overview.totalAttendees],
            ['Total Male', overview.totalMale],
            ['Total Female', overview.totalFemale],
            ['Total Organizations', overview.totalOrganizations],
            ['Upto 25 Years', overview.totalUpto25],
            ['25-40 Years', overview.total25To40],
            ['40 Above Years', overview.totalabove40],
            ['Total Benefitted', overview.totalBenefitted],
            ['Total Disability', overview.totalDisability],
            ['Total Dalit', overview.totalDalit],
            ['Total Tharu', overview.totalTharu],
            ['Total Janajati', overview.totalJanajati],
            ['Total Brahman/Chhetri', overview.totalBrahmanChhetri],
            ['Total Madhesi', overview.totalMadhesi],
            ['Total Others Caste', overview.totalOthersCaste],
            ['Total Poverty A', overview.totalPovertyA],
            ['Total Poverty B', overview.totalPovertyB],
            ['Total Poverty C', overview.totalPovertyC],
            ['Total Poverty D', overview.totalPovertyD]
        ];
        const summarySheet = xlsx.utils.aoa_to_sheet(summarySheetData);
        xlsx.utils.book_append_sheet(workbook, summarySheet, 'Summary');
        const eventSummarySheet = xlsx.utils.aoa_to_sheet(eventSummaryData);
        xlsx.utils.book_append_sheet(workbook, eventSummarySheet, 'Event Summary');
        const excelBuffer = xlsx.write(workbook, { type: 'buffer' });
        res.setHeader('Content-Disposition', `attachment; filename=project_${project.id}.xlsx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(excelBuffer);
    } catch (err) {
        console.error('Error exporting project data:', err);
        res.status(500).send('Error exporting project data');
    }
};