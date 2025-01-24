const EventWbenificiary = require('../models/EventWbenificiary');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const Joi = require('joi');
const XLSX = require('xlsx');

// Controller to render the event form
exports.renderEventForm = (req, res) => {
  res.render('eventEbineficiartForm'); // Ensure this matches the correct EJS template
};

// Controller to handle form submission for event
exports.submitEvent = async (req, res) => {
  try {
    const {eventName,eventType,startDate,endDate,province,district,municipality,nationalLevel,facilitators,beneficiaries,longitude,latitude,} = req.body;

    // Ensure longitude and latitude are provided
    if (!longitude || !latitude) {
      return res.status(400).send('Longitude and Latitude are required.');
    }

    // Parse and clean beneficiaries data
    let cleanedBeneficiaries = [];
    if (beneficiaries) {
      cleanedBeneficiaries = Array.isArray(beneficiaries)
        ? beneficiaries
        : JSON.parse(beneficiaries || '[]');
    }

    cleanedBeneficiaries = cleanedBeneficiaries.filter((b) => b && b.name); // Filter invalid entries

    // Normalize and validate beneficiaries
    cleanedBeneficiaries = cleanedBeneficiaries.map((beneficiary) => {
      if (!beneficiary.associatedOrganization || !beneficiary.associatedOrganization.name || !beneficiary.associatedOrganization.main) {
        throw new Error(`Invalid associated organization for beneficiary "${beneficiary.name}". 'main' is required.`);
      }

      const associatedOrganization = beneficiary.associatedOrganization;

      // Clean and normalize fields
      associatedOrganization.name = associatedOrganization.name.trim();
      associatedOrganization.main = associatedOrganization.main.trim();

      // Normalize subType based on main type
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

      // Assign unique ID if missing
      if (!beneficiary.uniqueId) {
        beneficiary.uniqueId = uuidv4();
      }

      return beneficiary;
    });

    // Create the new event document
    const eventWithBeneficiary = new EventWbenificiary({
      eventName,
      eventType,
      startDate,
      endDate,
      venue: { province, district, municipality },
      nationalLevel,
      facilitators: facilitators ? facilitators.split(',').map((f) => f.trim()) : [],
      beneficiaries: cleanedBeneficiaries,
      photographs: req.files['photographs']?.map((file) => file.path) || [],
      reports: req.files['reports']?.map((file) => file.path) || [],
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
    });
    // Save to database
    await eventWithBeneficiary.save();
    res.redirect('/event-list');
  } catch (error) {
    console.error('Error saving event:', error.message);
    if (!res.headersSent) {
      res.status(500).send(error.message || 'Error saving event.');
    }
  }
};

// Show edit form for a specific event
exports.showEditForm = async (req, res) => {
  try {
    const event = await EventWbenificiary.findById(req.params.id).exec();
    if (!event) {
      return res.status(404).send('Event not found');
    }
    res.render('editEventWithBeneficiary', { event });
  } catch (error) {
    console.error(`Error fetching event with ID ${req.params.id}:`, error.message);
    res.status(500).send('Server Error');
  }
};


exports.updateEvent = async (req, res) => {
  try {
    console.log(req.body); // Check if the form data is coming through

    const { eventName, eventType, startDate, endDate, province, district, municipality, latitude, longitude, nationalLevel, facilitators, beneficiaries, photographs, reports } = req.body;
    const eventId = req.params.id;
    
    // Update logic
    const updatedEvent = await EventWbenificiary.findByIdAndUpdate(eventId, {
      eventName,
      eventType,
      startDate,
      endDate,
      venue: { province, district, municipality },
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      nationalLevel,
      facilitators: facilitators ? facilitators.split(',').map(facilitator => facilitator.trim()) : [],
      beneficiaries,
      photographs,
      reports,
    }, { new: true });

    if (!updatedEvent) {
      return res.status(404).json({ message: 'Event not found' });
    }

    console.log("Updated Event: ", updatedEvent); // Check updated data
    res.redirect('/event-list');
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ message: 'Server error, failed to update event', error: error.message });
  }
};




  // deleting events with its associated photographs and reports
  exports.deleteEvent = async (req, res) => {
    try {
      const event = await EventWbenificiary.findById(req.params.id).exec();
      if (!event) {
        return res.status(404).send('Event not found');
      }
      if (event.photographs && event.photographs.length > 0) {
        for (const photoPath of event.photographs) {
          try {
            await fs.unlink(photoPath);
          } catch (error) {
            console.error(`Error deleting photograph: ${photoPath}`, error.message);
          }
        }
      }
      if (event.reports && event.reports.length > 0) {
        for (const reportPath of event.reports) {
          try {
            await fs.unlink(reportPath);
          } catch (error) {
            console.error(`Error deleting report: ${reportPath}`, error.message);
          }
        }
      }
      await EventWbenificiary.findByIdAndDelete(req.params.id);
      res.redirect('/event-list');
    } catch (err) {
      console.error('Error deleting event:', err.message);
      res.status(500).send(`Server Error: ${err.message}`);
    }
  };
    


exports.viewAllEventData = async (req,res) => {
    try {
        const events = await EventWbenificiary.find(); // Get all events

        // Aggregate data for each event
        const overview = events.map(event => {
            const totalAttendees = event.beneficiaries.length;

            return {
                eventId: event._id,    // Add eventId for matching in the template
                totalAttendees,
            };
        });

        // Pass events and the overview data to the view
        res.render('eventList', { datas: events, overview });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
}


exports.viewOneEventData = async (req, res) => {
    try {
        // Find the event by its unique ID
        const event = await EventWbenificiary.findById(req.params.id).exec();

        if (!event) {
            return res.status(404).send('Event not found');
        }

        // Calculate the beneficiary summary (overview) data
        const totalAttendees = event.beneficiaries.length;
        const totalMale = event.beneficiaries.filter(b => b.gender === 'Male').length;
        const totalFemale = event.beneficiaries.filter(b => b.gender === 'Female').length;
        const totalOrganizations = new Set(event.beneficiaries.map(b => b.associatedOrganization.name)).size;
        const totalUpto25 = event.beneficiaries.filter(b => b.age === 'Upto 25 years').length;
        const total25To40 = event.beneficiaries.filter(b => b.age === '25-40 years').length;
        const totalabove40 = event.beneficiaries.filter(b => b.age === '40 above years').length;
        const totalBenefitted = event.beneficiaries.filter(b => b.benefitsFromActivity).length;

        // Calculate additional summary data
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

        // Prepare the overview data
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
