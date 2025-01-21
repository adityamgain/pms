const EventWbenificiary = require('../models/EventWbenificiary');
const { v4: uuidv4 } = require('uuid');

// Controller to render the event form
exports.renderEventForm = (req, res) => {
  res.render('eventEbineficiartForm'); // Ensure this matches the correct EJS template
};

// Controller to handle form submission for event
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
      beneficiaries,
      longitude,
      latitude,
    } = req.body;

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
