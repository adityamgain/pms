const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const EventWbenificiary = require('./EventWbenificiary');

const ProjectSchema = new mongoose.Schema({
    projectName: { type: String, required: true },
    donor: { type: String, required: true },
    stakeholders: [{ type: String }],
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
    areaOfAction: [{
        type: String,
        enum: [
            'Nature-based commercial agriculture',
            'Sustainable Forest Management',
            'Water',
            'Climate Change'
        ],
        required: true
    }],
    reportingPeriod: { 
        type: String, 
        enum: ['Monthly', 'Quarterly', 'Semi-Annually','Annually'], 
        required: true 
    },
    events: [{ type: mongoose.Schema.Types.ObjectId, ref: 'EventWbenificiary' }],
    codeName: { type: String, unique: true, required: true },
    projectStatus: {
        type: String,
        enum: ['Planning', 'Active', 'Completed'],
        default: 'Planning',
        required: true
    },
    activities: [
        {
            name: { type: String, required: true },
            outcomes: { type: [String], default: [] }
        }
    ]
});

module.exports = mongoose.model('Project', ProjectSchema);