const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Define Beneficiary Schema
const BeneficiarySchema = new mongoose.Schema({
    name: { type: String, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    age: { type: String, enum: ['Upto 25 years', '25-40 years', '40 above years'], required: true },
    casteEthnicity: { type: String, enum: ['Dalit', 'Janajati', 'Brahman/Chhetri', 'Tharu', 'Madhesi', 'Others'] },
    associatedOrganization: {
        name: { 
            type: String, 
            required: true 
        },
        main: { 
            type: String, 
            enum: ['Community', 'Market', 'Government', 'CSO'], 
            required: true 
        },
        subType: { 
            type: String, 
            required: false, 
            default: null
        }
    },
    disability: { type: Boolean, default: false },
    povertyStatus: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
    benefitsFromActivity: { type: Boolean, default: false }
});


// Define Event Schema
const EventWbenificiarySchema = new mongoose.Schema({
    eventName: { type: String, required: true },
    outcome: { type: String, required: true },
    eventType: { 
        type: String, 
        enum: ['Workshop', 'Meeting', 'Training', 'Dialogues', 'Facilities', 'Inputs', 'Infrastructures'], 
        required: true 
    },
    startDate: { type: Date, required: true },
    endDate: { 
        type: Date, 
        required: true,
        validate: {
            validator: function (value) {
                return this.startDate <= value;
            },
            message: 'End date must be greater than or equal to start date.'
        }
    },
    location: {
        type: {
          type: String,
          enum: ['Point'], // Restricts the type to "Point"
          required: true,
        },
        coordinates: {
          type: [Number], // Array of numbers [longitude, latitude]
          required: true,
          validate: {
            validator: function (value) {
              return value.length === 2; // Ensure it contains exactly [longitude, latitude]
            },
            message: 'Location coordinates must include exactly [longitude, latitude].',
          },
        },
      },      
    venue: {
        municipality: { type: String, required: true },
        district: { type: String, required: true },
        province: { type: String, required: true },
    },
    nationalLevel: { 
        type: String, 
        enum: ['National', 'Provincial', 'District', 'Municipal'], 
        required: true 
    }, 
    facilitators: [{ type: String }], // List of facilitators
    beneficiaries: [BeneficiarySchema], // Embedded array of beneficiaries
    photographs: [{ type: String }], // Paths to uploaded photographs
    reports: [{ type: String }] // Paths to uploaded reports
});

// Define and Export Model
const EventWbenificiary = mongoose.model('EventWbenificiary', EventWbenificiarySchema);

module.exports = EventWbenificiary;
