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
      options: { type: [String], default: [] }
    }
  ],
  under_project: {
    type: String, // or ObjectId if referencing another collection
    required: true
  }
});

module.exports = mongoose.model('SchemaDefinition', SchemaDefinitionSchema);
