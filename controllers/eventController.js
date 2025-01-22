const EventWbenificiary = require('../models/EventWbenificiary');
const { v4: uuidv4 } = require('uuid');

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
    res.status(201).send('Event created successfully.');
  } catch (error) {
    console.error('Error saving event:', error.message);
    if (!res.headersSent) {
      res.status(500).send(error.message || 'Error saving event.');
    }
  }
};

// Display the edit form for a specific event
exports.showEditForm = async (req, res) => {
    try {
      const event = await EventWbenificiary.findById(req.params.id).exec();
      if (!event) {
        return res.status(404).send('Event not found');
      }
      res.render('editEventWithBineifciary', { event });
    } catch (error) {
      console.error('Error fetching event:', error.message);
      res.status(500).send('Server Error');
    }
  };


  // Handle the update of a specific event
  exports.updateEvent = async (req, res) => {
    try {
      const { eventName, eventType, startDate, endDate, province, district, municipality, nationalLevel, facilitators, beneficiaries, longitude, latitude } = req.body;
  
      if (!longitude || !latitude) {
        return res.status(400).send('Longitude and Latitude are required.');
      }
  
      let cleanedBeneficiaries = [];
      if (beneficiaries) {
        cleanedBeneficiaries = Array.isArray(beneficiaries) ? beneficiaries : JSON.parse(beneficiaries || '[]');
      }
  
      cleanedBeneficiaries = cleanedBeneficiaries.filter((b) => b && b.name);
  
      cleanedBeneficiaries = cleanedBeneficiaries.map((beneficiary) => {
        if (!beneficiary.associatedOrganization || !beneficiary.associatedOrganization.name || !beneficiary.associatedOrganization.main) {
          throw new Error(`Invalid associated organization for beneficiary "${beneficiary.name}". 'main' is required.`);
        }
  
        const associatedOrganization = beneficiary.associatedOrganization;
        associatedOrganization.name = associatedOrganization.name.trim();
        associatedOrganization.main = associatedOrganization.main.trim();
  
        if (associatedOrganization.main === 'Community') {
          associatedOrganization.subType = ['CFUG', 'FG'].includes(associatedOrganization.subType) ? associatedOrganization.subType : null;
        } else if (associatedOrganization.main === 'Government') {
          associatedOrganization.subType = ['National', 'Provincial', 'Municipal'].includes(associatedOrganization.subType) ? associatedOrganization.subType : null;
        } else {
          associatedOrganization.subType = null;
        }
  
        beneficiary.benefitsFromActivity = beneficiary.benefitsFromActivity === 'on';
        beneficiary.disability = beneficiary.disability === 'on';
  
        if (!beneficiary.uniqueId) {
          beneficiary.uniqueId = uuidv4();
        }
  
        return beneficiary;
      });
  
      const event = await EventWbenificiary.findById(req.params.id).exec();
      if (!event) {
        return res.status(404).send('Event not found');
      }
  
      event.eventName = eventName;
      event.eventType = eventType;
      event.startDate = startDate;
      event.endDate = endDate;
      event.venue = { province, district, municipality };
      event.nationalLevel = nationalLevel;
      event.facilitators = facilitators ? facilitators.split(',').map((f) => f.trim()) : [];
      event.beneficiaries = cleanedBeneficiaries;
      event.photographs = req.files['photographs']?.map((file) => file.path) || event.photographs;
      event.reports = req.files['reports']?.map((file) => file.path) || event.reports;
      event.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      };
  
      await event.save();
      res.status(200).send('Event updated successfully.');
    } catch (error) {
      console.error('Error updating event:', error);
      res.status(500).send(`Server Error: ${error.message}`);
    }
  };
    
//   // Handle the deletion of a specific event
//   exports.deleteEvent = async (req, res) => {
//     try {
//       const event = await EventWbenificiary.findByIdAndDelete(req.params.id).exec();
//       if (!event) {
//         return res.status(404).send('Event not found');
//       }
//       res.status(200).send('Event deleted successfully.');
//     } catch (error) {
//       console.error('Error deleting event:', error.message);
//       res.status(500).send('Server Error');
//     }
//   };

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
