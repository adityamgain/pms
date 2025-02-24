const EventWbenificiary = require('../models/EventWbenificiary');
const Project = require('../models/Project');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const fs = require('fs').promises;
const Joi = require('joi');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

const cloudinary = require('cloudinary').v2;
const path = require('path');


cloudinary.config({
  cloud_name: 'dgdbgblvb',
  api_key: '862544784633327',
  api_secret: 'h12L4lhNzkuB1ANCzZpboD0sNgQ'
});


// Controller to render the event form
exports.renderEventForm = async (req, res) => {
  try {
      const projectId = req.params.projectId;
      const project = await Project.findById(projectId);
      if (!project) {
          return res.status(404).send('Project not found');
      }
      // Extract activities and their outcomes
      const activities = project.activities || [];
      const outcomes = project.outcomes || [];

      res.render('eventEbineficiartForm', { projectId, activities, outcomes });
  } catch (error) {
      console.error("Error fetching project for event form:", error);
      res.status(500).send('Server error');
  }
};


exports.submitEvent = async (req, res) => {
  try {
    const {
      eventName,
      eventType,
      startDate,
      endDate,
      province,
      district,
      municipality,
      nationalLevel,
      facilitators,
      longitude,
      latitude,
    } = req.body;
    const { projectId } = req.params;
    const outcome = Array.isArray(req.body.outcome) ? req.body.outcome : [req.body.outcome];
    console.log('Project ID:', projectId);
    // Validate projectId
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).send('Invalid or missing project ID.');
    }
    // Validate longitude and latitude
    if (!longitude || !latitude || isNaN(longitude) || isNaN(latitude)) {
      return res.status(400).send('Valid longitude and latitude are required.');
    }
    // Process beneficiaries from Excel or JSON
    let cleanedBeneficiaries = [];
    if (req.files?.beneficiariesFile?.[0]) {
      cleanedBeneficiaries = await processExcelFile(req.files.beneficiariesFile[0].buffer);
    } else if (req.body.beneficiaries) {
      cleanedBeneficiaries = processJSONBeneficiaries(req.body.beneficiaries);
    }
    // Upload photographs and reports to Cloudinary
    const uploadToCloudinary = async (file) => {
      if (!file || !file.buffer) {
        console.error('File or file buffer is missing:', file);
        throw new Error('File buffer is missing.');
      }
      try {
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: `events/${projectId}` },
            (error, result) => {
              if (error) {
                console.error('Cloudinary upload stream error:', error.message);
                reject(new Error('Failed to upload file to Cloudinary.'));
              }
              resolve(result);
            }
          ).end(file.buffer);
        });
        return result.secure_url;
      } catch (error) {
        console.error('Cloudinary upload error:', error.message);
        throw new Error('Failed to upload file to Cloudinary.');
      }
    };
    const photographs = req.files?.photographs
      ? await Promise.all(req.files.photographs.map(uploadToCloudinary))
      : [];
    const reports = req.files?.reports
      ? await Promise.all(req.files.reports.map(uploadToCloudinary))
      : [];
    const eventWithBeneficiary = new EventWbenificiary({
      eventName,
      outcome,
      eventType,
      startDate,
      endDate,
      venue: { province, district, municipality },
      nationalLevel,
      facilitators: facilitators ? facilitators.split(',').map((f) => f.trim()) : [],
      beneficiaries: cleanedBeneficiaries,
      photographs,
      reports,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
    });
    const savedEvent = await eventWithBeneficiary.save();
    console.log('Event saved:', savedEvent);
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).send('Project not found.');
    }
    if (project.events.length === 0) {
      project.projectStatus = 'Active';
    }
    project.events.push(savedEvent._id);
    await project.save();
    console.log('Project updated with new event.');
    res.status(200).send('Event saved and linked to project successfully.');
  } catch (error) {
    console.error('Error saving event:', error.message);
    if (!res.headersSent) {
      res.status(500).send(error.message || 'Error saving event.');
    }
  }
};
const processExcelFile = async (fileBuffer) => {
  try {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('Uploaded file is empty.');
    }
    const fileType = fileBuffer.toString('utf8', 0, 4);
    if (!['PK\x03\x04', 'd0cf11e0a1b11ae1'].includes(fileType)) {
      throw new Error('Uploaded file is not a valid Excel file.');
    }
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('Excel file does not contain any sheets.');
    }
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    if (!jsonData || jsonData.length === 0) {
      throw new Error('Excel sheet is empty.');
    }
    console.log('Parsed JSON Data:', jsonData);
    return jsonData.map((row) => {
      const beneficiary = {
        name: row['Full Name'],
        gender: row['Gender'],
        age: row['Age Group'],
        casteEthnicity: row['Caste/Ethnicity'],
        associatedOrganization: {
          name: row['Organization'],
          main: row['Organization Type'],
        },
        povertyStatus: row['Poverty Status'],
        benefitsFromActivity: row['Benefits from Activity'] === 'Yes',
        disability: row['Disability'] === 'Yes',
      };
      if (!beneficiary.associatedOrganization.name || !beneficiary.associatedOrganization.main) {
        throw new Error(`Invalid associated organization for beneficiary "${beneficiary.name}".`);
      }
      beneficiary.associatedOrganization.name = beneficiary.associatedOrganization.name.trim();
      beneficiary.associatedOrganization.main = beneficiary.associatedOrganization.main.trim();
      if (beneficiary.associatedOrganization.main === 'Community') {
        beneficiary.associatedOrganization.subType = ['CFUG', 'FG'].includes(beneficiary.associatedOrganization.subType)
          ? beneficiary.associatedOrganization.subType
          : null;
      } else if (beneficiary.associatedOrganization.main === 'Government') {
        beneficiary.associatedOrganization.subType = ['National', 'Provincial', 'Municipal'].includes(beneficiary.associatedOrganization.subType)
          ? beneficiary.associatedOrganization.subType
          : null;
      } else {
        beneficiary.associatedOrganization.subType = null;
      }
      return beneficiary;
    });
  } catch (error) {
    console.error('Error processing Excel file:', error.message);
    throw new Error('Error processing Excel file.');
  }
};

// Helper function to process JSON beneficiaries
const processJSONBeneficiaries = (beneficiaries) => {
  try {
    const parsedBeneficiaries = Array.isArray(beneficiaries) ? beneficiaries : JSON.parse(beneficiaries);

    return parsedBeneficiaries
      .filter((b) => b && b.name) // Remove invalid entries
      .map((beneficiary) => {
        if (!beneficiary.associatedOrganization?.name || !beneficiary.associatedOrganization.main) {
          throw new Error(`Invalid associated organization for beneficiary "${beneficiary.name}".`);
        }

        const associatedOrganization = beneficiary.associatedOrganization;

        // Normalize organization fields
        associatedOrganization.name = associatedOrganization.name.trim();
        associatedOrganization.main = associatedOrganization.main.trim();

        // Validate subType based on main organization type
        if (associatedOrganization.main === 'Community') {
          associatedOrganization.subType = ['CFUG', 'FG'].includes(associatedOrganization.subType)
            ? associatedOrganization.subType
            : null;
        } else if (associatedOrganization.main === 'Government') {
          associatedOrganization.subType = ['National', 'Provincial', 'Municipal'].includes(associatedOrganization.subType)
            ? associatedOrganization.subType
            : null;
        } else {
          associatedOrganization.subType = null;
        }

        // Convert checkboxes to boolean
        beneficiary.benefitsFromActivity = beneficiary.benefitsFromActivity === 'on';
        beneficiary.disability = beneficiary.disability === 'on';

        return beneficiary;
      });
  } catch (error) {
    console.error('Error processing JSON beneficiaries:', error.message);
    throw new Error('Invalid beneficiaries data format.');
  }
};


// Show edit form for a specific event
exports.showEditForm = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const project = await Project.findById(projectId);  
    const event = await EventWbenificiary.findById(req.params.id).exec();
    if (!event) {
      return res.status(404).send('Event not found');
    }
    res.render('editEventWithBeneficiary', { event, activities: project.activities, outcomes: project.outcomes });
  } catch (error) {
    console.error(`Error fetching event with ID ${req.params.id}:`, error.message);
    res.status(500).send('Server Error');
  }
};

exports.updateEvent = async (req, res) => {
  try {
    console.log('Request Body:', req.body); 
    const {
      eventName,
      outcome,
      eventType,
      startDate,
      endDate,
      province,
      district,
      municipality,
      latitude,
      longitude,
      nationalLevel,
      facilitators,
      beneficiaries,
    } = req.body;
    const eventId = req.params.id;
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (!startDateObj || !endDateObj || isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({ message: 'Invalid start date or end date.' });
    }
    if (endDateObj < startDateObj) {
      return res.status(400).json({ message: 'End date must be greater than or equal to start date.' });
    }
    const beneficiariesArray = Array.isArray(beneficiaries) ? beneficiaries : [beneficiaries];
    const cleanedBeneficiaries = beneficiariesArray.map((beneficiary) => {
      if (typeof beneficiary === 'string') {
        beneficiary = JSON.parse(beneficiary);
      }
      if (!beneficiary.associatedOrganization?.name || !beneficiary.associatedOrganization.main) {
        throw new Error(`Invalid associated organization for beneficiary "${beneficiary.name}".`);
      }
      const associatedOrganization = beneficiary.associatedOrganization;
      associatedOrganization.name = associatedOrganization.name.trim();
      associatedOrganization.main = associatedOrganization.main.trim();
      if (associatedOrganization.main === 'Community') {
        associatedOrganization.subType = ['CFUG', 'FG'].includes(associatedOrganization.subType)
          ? associatedOrganization.subType
          : null;
      } else if (associatedOrganization.main === 'Government') {
        associatedOrganization.subType = ['National', 'Provincial', 'Municipal'].includes(associatedOrganization.subType)
          ? associatedOrganization.subType
          : null;
      } else {
        associatedOrganization.subType = null;
      }
      beneficiary.benefitsFromActivity = beneficiary.benefitsFromActivity === 'on';
      beneficiary.disability = beneficiary.disability === 'on';
      return beneficiary;
    });
    const event = await EventWbenificiary.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    event.eventName = eventName;
    event.outcome = outcome;
    event.eventType = eventType;
    event.startDate = startDateObj;
    event.endDate = endDateObj;
    event.venue = { province, district, municipality };
    event.location = {
      type: 'Point',
      coordinates: [parseFloat(longitude), parseFloat(latitude)],
    };
    event.nationalLevel = nationalLevel;
    event.facilitators = facilitators ? facilitators.split(',').map(facilitator => facilitator.trim()) : [];
    event.beneficiaries = cleanedBeneficiaries || []; 
    if (req.files) {
      if (req.files['photographs']) {
        event.photographs = req.files['photographs'].map(file => file.path);
      }
      if (req.files['reports']) {
        event.reports = req.files['reports'].map(file => file.path);
      }
    }
    const updatedEvent = await event.save();
    console.log('Updated Event:', updatedEvent); 
    res.redirect('/');
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ message: 'Server error, failed to update event', error: error.message });
  }
};


  // deleting events with its associated photographs and reports
  exports.deleteEvent = async (req, res) => {
    try {
      const eventId = req.params.id;
      
      // Find the event by ID
      const event = await EventWbenificiary.findById(eventId);
      if (!event) {
        return res.status(404).send('Event not found');
      }
  
      // Delete associated photographs
      if (event.photographs && event.photographs.length > 0) {
        for (const photoPath of event.photographs) {
          try {
            await fs.unlink(photoPath);
          } catch (error) {
            console.error(`Error deleting photograph: ${photoPath}`, error.message);
          }
        }
      }
  
      // Delete associated reports
      if (event.reports && event.reports.length > 0) {
        for (const reportPath of event.reports) {
          try {
            await fs.unlink(reportPath);
          } catch (error) {
            console.error(`Error deleting report: ${reportPath}`, error.message);
          }
        }
      }
  
      // Remove the event reference from the associated project
      await Project.updateOne({ events: eventId }, { $pull: { events: eventId } });
  
      // Delete the event from the database
      await EventWbenificiary.findByIdAndDelete(eventId);
  
      res.redirect('/');
    } catch (err) {
      console.error('Error deleting event:', err.message);
      res.status(500).send(`Server Error: ${err.message}`);
    }
  };
      


  exports.viewAllEventData = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { eventType, startDate, endDate, nationalLevel, sort, outcome, activity, municipality, district, province, exportToExcel } = req.query;

        // Validate project
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).send('Project not found');
        }

        // Build the query
        let query = { _id: { $in: project.events } };

        // Add filters only if they are defined and valid
        if (eventType && eventType !== 'undefined') query.eventType = eventType;
        if (nationalLevel && nationalLevel !== 'undefined') query.nationalLevel = nationalLevel;
        if (outcome && outcome !== 'undefined') query.outcome = outcome;
        if (activity && activity !== 'undefined') query.eventName = activity;
        if (municipality && municipality !== 'undefined') query["venue.municipality"] = municipality;
        if (district && district !== 'undefined') query["venue.district"] = district;
        if (province && province !== 'undefined') query["venue.province"] = province;

        // Validate and include startDate and endDate in the query
        if (startDate && startDate !== 'undefined' && !isNaN(new Date(startDate).getTime())) {
            query.startDate = { $gte: new Date(startDate) };
        }
        if (endDate && endDate !== 'undefined' && !isNaN(new Date(endDate).getTime())) {
            query.endDate = { $lte: new Date(endDate) };
        }

        console.log("MongoDB Query:", query); // Log the query
        let events = await EventWbenificiary.find(query);
        console.log("Events Length:", events.length); // Log events length

        const eventLocations = events
            .filter(event => event.location && event.location.coordinates)
            .map(event => ({
                coordinates: event.location.coordinates,
                venue: event.venue,
                eventName: event.eventName
            }));

        const allEvents = await EventWbenificiary.find({ _id: { $in: project.events } });
        const uniqueOutcomes = [...new Set(allEvents.map(e => e.outcome).filter(Boolean))];
        const uniqueActivities = [...new Set(allEvents.map(e => e.eventName).filter(Boolean))];
        const uniquemunicipality = [...new Set(allEvents.map(e => e.venue?.municipality).filter(Boolean))];
        const uniqueDistricts = [...new Set(allEvents.map(e => e.venue?.district).filter(Boolean))];
        const uniqueProvinces = [...new Set(allEvents.map(e => e.venue?.province).filter(Boolean))];

        const overview = events.map(event => {
            const totalAttendees = event.beneficiaries.length;
            const totalBenefited = event.beneficiaries.filter(b => b.benefitsFromActivity).length;
            const benefitedRatio = totalAttendees > 0 ? (totalBenefited / totalAttendees) * 100 : 0;
            return {
                eventId: event._id,
                totalAttendees,
                benefitedRatio: benefitedRatio.toFixed(2)
            };
        });

        const eventTypeCount = {};
        const genderCount = { Male: 0, Female: 0, Other: 0 };
        const povertyStatusCount = { A: 0, B: 0, C: 0, D: 0 };

        const casteCategories = ['Dalit', 'Janajati', 'Brahman/Chhetri', 'Tharu', 'Madhesi', 'Others'];
        const casteCount = { Dalit: 0, Janajati: 0, 'Brahman/Chhetri': 0, Tharu: 0, Madhesi: 0, Others: 0 };
        const ageGroupCount = { 'Upto 25 years': 0, '25-40 years': 0, '40 above years': 0 };

        events.forEach(event => {
            eventTypeCount[event.eventType] = (eventTypeCount[event.eventType] || 0) + 1;
            event.beneficiaries.forEach(beneficiary => {
                genderCount[beneficiary.gender] = (genderCount[beneficiary.gender] || 0) + 1;
                povertyStatusCount[beneficiary.povertyStatus] = (povertyStatusCount[beneficiary.povertyStatus] || 0) + 1;

                if (casteCategories.includes(beneficiary.casteEthnicity)) {
                    casteCount[beneficiary.casteEthnicity]++;
                } else {
                    casteCount['Others']++;
                }

                if (beneficiary.age === 'Upto 25 years') {
                    ageGroupCount['Upto 25 years']++;
                } else if (beneficiary.age === '25-40 years') {
                    ageGroupCount['25-40 years']++;
                } else if (beneficiary.age === '40 above years') {
                    ageGroupCount['40 above years']++;
                }
            });
        });

        if (sort === 'asc') {
            events = events.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        } else if (sort === 'desc') {
            events = events.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        } else if (sort === 'highest_attendee') {
            events = events.sort((a, b) => {
                return overview.find(o => o.eventId.toString() === b._id.toString()).totalAttendees -
                       overview.find(o => o.eventId.toString() === a._id.toString()).totalAttendees;
            });
        } else if (sort === 'lowest_attendee') {
            events = events.sort((a, b) => {
                return overview.find(o => o.eventId.toString() === a._id.toString()).totalAttendees -
                       overview.find(o => o.eventId.toString() === b._id.toString()).totalAttendees;
            });
        }

        const beneficiariesSheetData = [
            [
                'SN', 'Year', 'Month', 'Start Date (dd-mm-yyyy)', 'End Date (dd-mm-yyyy)',
                'Duration (days)', 'Events', 'Event Outcomes', 'Facilitators', 'National Level',
                'Province', 'District', 'Municipality', 'Type.Category', 'Linked to Field of Action',
                'Beneficiary Name', 'Organization', 'Organization Type', 'Gender', 'Age',
                'Caste', 'Poverty Status', 'Disability'
            ]
        ];

        const eventSummaryData = [
            [
                'SN', 'Year', 'Month', 'Start Date (dd-mm-yyyy)', 'End Date (dd-mm-yyyy)',
                'Duration (days)', 'Events', 'Event Outcomes', 'Facilitators', 'National Level',
                'Province', 'District', 'Municipality', 'Type.Category', 'Linked to Field of Action',
                'Total Attendees', 'Total Male', 'Total Female', 'Total 25 Yrs', 'Total 25-40 Yrs',
                'Total 40 Above', 'Total Benefitted', 'Total Disability', 'Total Dalit', 'Total Tharu',
                'Total Janajati', 'Total Brahman/Chhetri', 'Total Madhesi', 'Total Others Caste',
                'Total Poverty A', 'Total Poverty B', 'Total Poverty C', 'Total Poverty D'
            ]
        ];
        console.log("Event Summary Data (before loop):", eventSummaryData); // Log before loop

        let beneficiarySn = 1; // Separate counter for Beneficiaries sheet
        let eventSn = 1;

        events.forEach(event => {
            console.log("Processing event:", event.eventName, event._id); // Log at start of loop
            console.log("Event Beneficiaries:", event.beneficiaries); // Log beneficiaries

            const year = event.startDate ? new Date(event.startDate).getFullYear() : '';
            const month = event.startDate ? new Date(event.startDate).toLocaleString('default', { month: 'long' }) : '';
            const startDate = event.startDate ? new Date(event.startDate).toLocaleDateString('en-GB') : '';
            const endDate = event.endDate ? new Date(event.endDate).toLocaleDateString('en-GB') : '';
            const duration = event.startDate && event.endDate ?
                ((new Date(event.endDate) - new Date(event.startDate)) / (1000 * 60 * 60 * 24)).toFixed(2) : '';

            // Add beneficiaries data
            if (event.beneficiaries && event.beneficiaries.length > 0) {
                event.beneficiaries.forEach(b => {
                    beneficiariesSheetData.push([
                        beneficiarySn,
                        year,
                        month,
                        startDate,
                        endDate,
                        duration,
                        event.eventName || '',
                        event.outcome || '',
                        event.facilitators ? event.facilitators.join(', ') : '',
                        event.nationalLevel || '',
                        event.venue?.province || '',
                        event.venue?.district || '',
                        event.venue?.municipality || '',
                        event.eventType || '',
                        event.linkedToFieldOfAction || '',
                        b.name || '',
                        b.organization || '',
                        b.organizationType || '',
                        b.gender || '',
                        b.age || '',
                        b.casteEthnicity || '',
                        b.povertyStatus || '',
                        b.disabilityStatus || ''
                    ]);
                    beneficiarySn++;
                });
            }

            // Add event summary data
            const totalAttendees = event.beneficiaries ? event.beneficiaries.length : 0;
            const totalMale = event.beneficiaries ? event.beneficiaries.filter(b => b.gender === 'Male').length : 0;
            const totalFemale = event.beneficiaries ? event.beneficiaries.filter(b => b.gender === 'Female').length : 0;
            const total25Yrs = event.beneficiaries ? event.beneficiaries.filter(b => b.age === 'Upto 25 years').length : 0;
            const total25_40Yrs = event.beneficiaries ? event.beneficiaries.filter(b => b.age === '25-40 years').length : 0;
            const total40Above = event.beneficiaries ? event.beneficiaries.filter(b => b.age === '40 above years').length : 0;
            const totalBenefitted = event.beneficiaries ? event.beneficiaries.filter(b => b.benefitsFromActivity).length : 0;
            const totalDisability = event.beneficiaries ? event.beneficiaries.filter(b => b.disabilityStatus).length : 0;
            const totalDalit = event.beneficiaries ? event.beneficiaries.filter(b => b.casteEthnicity === 'Dalit').length : 0;
            const totalTharu = event.beneficiaries ? event.beneficiaries.filter(b => b.casteEthnicity === 'Tharu').length : 0;
            const totalJanajati = event.beneficiaries ? event.beneficiaries.filter(b => b.casteEthnicity === 'Janajati').length : 0;
            const totalBrahmanChhetri = event.beneficiaries ? event.beneficiaries.filter(b => b.casteEthnicity === 'Brahman/Chhetri').length : 0;
            const totalMadhesi = event.beneficiaries ? event.beneficiaries.filter(b => b.casteEthnicity === 'Madhesi').length : 0;
            const totalOthersCaste = event.beneficiaries ? event.beneficiaries.filter(b => b.casteEthnicity === 'Others').length : 0;
            const totalPovertyA = event.beneficiaries ? event.beneficiaries.filter(b => b.povertyStatus === 'A').length : 0;
            const totalPovertyB = event.beneficiaries ? event.beneficiaries.filter(b => b.povertyStatus === 'B').length : 0;
            const totalPovertyC = event.beneficiaries ? event.beneficiaries.filter(b => b.povertyStatus === 'C').length : 0;
            const totalPovertyD = event.beneficiaries ? event.beneficiaries.filter(b => b.povertyStatus === 'D').length : 0;


            console.log("Total Attendees:", totalAttendees);
            console.log("Total Male:", totalMale);

            const dataRow = [ // Construct data row array
                eventSn, year, month, startDate, endDate, duration, event.eventName || '', event.outcome || '',
                event.facilitators ? event.facilitators.join(', ') : '', event.nationalLevel || '',
                event.venue?.province || '', event.venue?.district || '', event.venue?.municipality || '',
                event.eventType || '', event.linkedToFieldOfAction || '', totalAttendees, totalMale, totalFemale,
                total25Yrs, total25_40Yrs, total40Above, totalBenefitted, totalDisability, totalDalit, totalTharu,
                totalJanajati, totalBrahmanChhetri, totalMadhesi, totalOthersCaste, totalPovertyA, totalPovertyB,
                totalPovertyC, totalPovertyD
            ];
            console.log("Data Row to Push:", dataRow); // Log data row before push
            eventSummaryData.push(dataRow);
            eventSn++;
            console.log("Event Summary Data Length after push:", eventSummaryData.length); // Log length after push
        });
        console.log("Event Summary Data (after loop):", eventSummaryData); // Log after loop

        if (exportToExcel === 'true') {
            const workbook = new ExcelJS.Workbook();
            const beneficiariesSheet = workbook.addWorksheet('Beneficiaries');
            const eventSummarySheet = workbook.addWorksheet('Event Summary');


            // Add data to sheets
            beneficiariesSheet.addRows(beneficiariesSheetData);
            eventSummarySheet.addRows(eventSummaryData);

            // Set headers and send file
            res.setHeader('Content-Disposition', `attachment; filename="Event_Data_${new Date().toISOString().split('T')[0]}.xlsx"`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');            await workbook.xlsx.write(res);
            res.end();
            return;
        }

        const pivotData = eventSummaryData;


        res.render('eventList', {
            datas: events,
            overview,
            project,
            eventLocations,
            filters: { eventType, startDate, endDate, nationalLevel, sort, outcome, activity, municipality, district, province },
            uniqueOutcomes,
            uniqueActivities,
            uniquemunicipality,
            uniqueDistricts,
            uniqueProvinces,
            eventTypeCount,
            genderCount,
            povertyStatusCount,
            casteCount,
            ageGroupCount,
            pivotData: pivotData
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};






exports.viewOneEventData = async (req, res) => {
    try {
        const event = await EventWbenificiary.findById(req.params.id).exec();
        if (!event) {
            return res.status(404).send('Event not found');
        }
        const totalAttendees = event.beneficiaries.length;
        const totalMale = event.beneficiaries.filter(b => b.gender === 'Male').length;
        const totalFemale = event.beneficiaries.filter(b => b.gender === 'Female').length;
        const totalOrganizations = new Set(event.beneficiaries.map(b => b.associatedOrganization.name)).size;
        const totalUpto25 = event.beneficiaries.filter(b => b.age === 'Upto 25 years').length;
        const total25To40 = event.beneficiaries.filter(b => b.age === '25-40 years').length;
        const totalabove40 = event.beneficiaries.filter(b => b.age === '40 above years').length;
        const totalBenefitted = event.beneficiaries.filter(b => b.benefitsFromActivity).length;
        const totalDalit = event.beneficiaries.filter(b => b.casteEthnicity === 'Dalit').length;
        const totalJanajati = event.beneficiaries.filter(b => b.casteEthnicity === 'Janajati').length;
        const totalBrahmanChhetri = event.beneficiaries.filter(b => b.casteEthnicity === 'Brahman/Chhetri').length;
        const totalTharu = event.beneficiaries.filter(b => b.casteEthnicity === 'Tharu').length;
        const totalMadhesi = event.beneficiaries.filter(b => b.casteEthnicity === 'Madhesi').length;
        const totalOthersCaste = event.beneficiaries.filter(b => b.casteEthnicity === 'Others').length;
        const totalDisability = event.beneficiaries.filter(b => b.disability === true).length;
        const totalPovertyA = event.beneficiaries.filter(b => b.povertyStatus === 'A').length;
        const totalPovertyB = event.beneficiaries.filter(b => b.povertyStatus === 'B').length;
        const totalPovertyC = event.beneficiaries.filter(b => b.povertyStatus === 'C').length;
        const totalPovertyD = event.beneficiaries.filter(b => b.povertyStatus === 'D').length;

        const overview = {
            totalAttendees,
            totalMale,
            totalFemale,
            totalOrganizations,
            totalUpto25,
            total25To40,
            totalabove40,
            totalBenefitted,
            totalDalit,
            totalJanajati,
            totalBrahmanChhetri,
            totalTharu,
            totalMadhesi,
            totalOthersCaste,
            totalDisability,
            totalPovertyA,
            totalPovertyB,
            totalPovertyC,
            totalPovertyD
        };

        // Check if the request is for exporting to Excel
        if (req.query.export === 'excel') {
            // Create a new workbook
            const workbook = XLSX.utils.book_new();
            // Create a worksheet for the beneficiary summary
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
            const summarySheet = XLSX.utils.aoa_to_sheet(summarySheetData);
            XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

            // Create a worksheet for the beneficiaries
            const beneficiariesSheetData = event.beneficiaries.map((beneficiary, index) => [
                index + 1,
                beneficiary.name,
                beneficiary.associatedOrganization.name,
                beneficiary.associatedOrganization.main,
                beneficiary.gender,
                beneficiary.age,
                beneficiary.casteEthnicity,
                beneficiary.povertyStatus,
                beneficiary.benefitsFromActivity ? 'Yes' : 'No',
                beneficiary.disability ? 'Yes' : 'No'
            ]);
            const beneficiariesSheet = XLSX.utils.aoa_to_sheet([
                ['S.N.', 'Full Name', 'Organization', 'Organization Type', 'Gender', 'Age Group', 'Caste/Ethnicity', 'Poverty Status', 'Benefits from Activity', 'Disability'],
                ...beneficiariesSheetData
            ]);
            XLSX.utils.book_append_sheet(workbook, beneficiariesSheet, 'Beneficiaries');

            // Generate the Excel file and send it as a response
            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
            res.setHeader('Content-Disposition', 'attachment; filename="event_data.xlsx"');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            return res.send(buffer);
        }

        // Pass both the event data and overview to the view
        res.render('viewoneevent', { event, overview });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// Controller to fetch event data
exports.viewEventData = async (req, res) => {
  try {
    const datas = await EventWbenificiary.find({});
    res.render('view_event_bineficery', { datas }); // Ensure this matches the correct EJS template
  } catch (error) {
    console.error('Error fetching event data:', error.message);
    res.status(500).send('Error fetching event data');
  }
};


