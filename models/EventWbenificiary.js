const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Define Beneficiary Schema
const BeneficiarySchema = new mongoose.Schema({
    uniqueId: { 
        type: String, 
        required: true, 
        unique: true, 
        default: uuidv4 // Automatically generate a unique ID using uuid
    },
    name: { type: String, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    age: { type: String, enum: ['Upto 25 years', '25-40 years', '40 above years'], required: true },
    casteEthnicity: { type: String, enum: ['Dalit', 'Janajati', 'Brahman/Chhetri', 'Tharu', 'Madhesi', 'Others'] },
    associatedOrganization: {
        name: { type: String, required: true },
        type: {
          main: { type: String, enum: ['Community', 'Market', 'Government', 'CSO'], required: true },
          subType: { type: [String], default: [] }, // Example: ['Supplier', 'Processor']
        },
    }, // <- Correctly closing this block
    disability: { type: Boolean, default: false },
    povertyStatus: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
    benefitsFromActivity: { type: Boolean, default: false }
});


// Define Event Schema
const EventWbenificiarySchema = new mongoose.Schema({
    eventName: { type: String, required: true },
    eventType: { 
        type: String, 
        enum: ['Workshop', 'Meeting', 'Training', 'Dialogues', 'Facilities', 'Inputs', 'Infrastructures'], 
        required: true 
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    venue: { 
        municipality: String,
        district: String,
        province: String,
        nationalLevel: Boolean 
    },
    nationalLevel: { 
        type: String, 
        enum: ['National', 'Province', 'District', 'Municipality'], 
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
