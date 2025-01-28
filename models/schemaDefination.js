const mongoose = require('mongoose');

const SchemaDefinitionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  fields: [
    {
      fieldName: { type: String, required: true },
      fieldType: { type: String, required: true },
      required: { type: Boolean, default: false },
      options: { type: [String], default: [] },
      attendeeFields: {
        type: [{
          fieldName: { type: String, required: true },
          fieldType: { type: String, required: true },
        }],
        default: []
      }
    }
  ],
  under_project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program', // Reference to the Program model
    required: true
  }
});

module.exports = mongoose.model('SchemaDefinition', SchemaDefinitionSchema);
