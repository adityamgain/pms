const EventWbenificiary = require('../models/EventWbenificiary');
const Project = require('../models/Project');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const fs = require('fs').promises;
const Joi = require('joi');
const XLSX = require('xlsx');
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
        const { eventType, startDate, endDate, nationalLevel, sort, outcome, activity, municipality } = req.query;

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).send('Project not found');
        }

        let query = { _id: { $in: project.events } };
        if (eventType) query.eventType = eventType;
        if (nationalLevel) query.nationalLevel = nationalLevel;
        if (outcome) query.outcome = outcome;
        if (activity) query.eventName = activity; 
        if (municipality) query["venue.municipality"] = municipality; // Filtering by district
        if (startDate && endDate) {
            query.startDate = { $gte: new Date(startDate) };
            query.endDate = { $lte: new Date(endDate) };
        }

        let events = await EventWbenificiary.find(query);

        // Extract unique outcomes, event names, and districts
        const allEvents = await EventWbenificiary.find({ _id: { $in: project.events } });
        const uniqueOutcomes = [...new Set(allEvents.map(e => e.outcome).filter(Boolean))];
        const uniqueActivities = [...new Set(allEvents.map(e => e.eventName).filter(Boolean))];
        const uniquemunicipality = [...new Set(allEvents.map(e => e.venue?.municipality).filter(Boolean))]; // Extract districts

        // Generate event overview
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

        // Sorting logic
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

        res.render('eventList', { 
            datas: events, 
            overview, 
            project, 
            filters: { eventType, startDate, endDate, nationalLevel, sort, outcome, activity, municipality },
            uniqueOutcomes, 
            uniqueActivities,
            uniquemunicipality // Pass the unique districts to the template
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


