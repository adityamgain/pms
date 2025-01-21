const mongoose = require('mongoose');
const SchemaDefinition = require('../models/schemaDefination'); // Assuming your schema model is in 'models/SchemaDefinition'
const Program = require('../models/Program');
const Event = require('../models/Events');

const SchemaController = {
  async getSchemaList(req, res) {
    const { schemaUnderProject } = req.params;
    try {
      const program = await Program.findOne({ name: schemaUnderProject });

      if (!program) {
        return res.status(404).render('error', { message: `Program '${schemaUnderProject}' not found` });
      }

      const schemas = await SchemaDefinition.find({ under_project: program._id });
      const events = await Event.find({ under_project: program._id });

      res.render('schemaList', {
        schemas,
        events,
        programName: program.name,
        programId: program._id,
      });
    } catch (error) {
      console.error('Error fetching schemas:', error);
      res.status(500).render('error', { message: 'Internal Server Error' });
    }
  },

  showCreateSchemaForm(req, res) {
    const { schemaUnderProject } = req.params;
    res.render('createSchema', { schemaUnderProject });
  },

  async createSchema(req, res) {
    try {
      const { name, fields, schemaUnderProject } = req.body;

      if (!name || !schemaUnderProject || !fields || fields.length === 0) {
        return res.status(400).send('Schema name, fields, and project are required.');
      }

      const fieldArray = Array.isArray(fields) ? fields : Object.values(fields);
      
      const sanitizedFields = fieldArray.map((field, index) => {
        const options = Array.isArray(field.options) ? field.options : Object.values(field.options || []);
        const attendeeFields = Array.isArray(field.attendeeFields)
          ? field.attendeeFields
          : Object.values(field.attendeeFields || []);

        if (!field.fieldName || !field.fieldType) {
          throw new Error(`Field name and field type are required for field at index ${index}`);
        }

        const sanitizedOptions = options.map((opt) => opt.trim()).filter(Boolean);
        const sanitizedAttendeeFields = attendeeFields.map((attendee) => ({
          fieldName: attendee.fieldName?.trim(),
          fieldType: attendee.fieldType?.trim(),
        })).filter(attendee => attendee.fieldName && attendee.fieldType);

        return {
          fieldName: field.fieldName.trim(),
          fieldType: field.fieldType.trim(),
          required: field.required === 'on' || field.required === true,
          options: sanitizedOptions,
          attendeeFields: sanitizedAttendeeFields,
        };
      });

      const newSchema = new SchemaDefinition({
        name: name.trim(),
        fields: sanitizedFields,
        under_project: schemaUnderProject.trim(),
      });

      await newSchema.save();
      res.status(201).send('Schema created successfully');
    } catch (err) {
      console.error(err);
      res.status(500).send(`Error creating schema: ${err.message}`);
    }
  },

  async showDynamicForm(req, res) {
    const { schemaId } = req.params;
    const schema = await SchemaDefinition.findById(schemaId);
    if (!schema) {
      return res.status(404).send('Schema not found');
    }
    res.render('dynamicForm', { schema });
  },

  async submitDynamicForm(req, res) {
    try {
      const { schemaId } = req.params;
      const schema = await SchemaDefinition.findById(schemaId);
      if (!schema) {
        return res.status(404).send('Schema not found');
      }
      const collectionName = `${schema.name.toLowerCase()}_data`;
      const DynamicModel = mongoose.models[collectionName] || mongoose.model(collectionName, new mongoose.Schema({}, { strict: false }));
      const submittedData = new DynamicModel(req.body);
      await submittedData.save();
      res.send('Form data saved successfully!');
    } catch (err) {
      console.error(err);
      res.status(500).send('An error occurred while saving the data.');
    }
  },

  async viewSchemaData(req, res) {
    const { schemaId } = req.params;
    const schema = await SchemaDefinition.findById(schemaId);
    if (!schema) {
      return res.status(404).send('Schema not found');
    }
    const collectionName = `${schema.name.toLowerCase()}_data`;
    const DynamicModel = mongoose.models[collectionName] || mongoose.model(collectionName, new mongoose.Schema({}, { strict: false }));
    const data = await DynamicModel.find({});
    res.render('viewData', { schema, data });
  },

  async deleteSchema(req, res) {
    const { schemaId } = req.params;
    try {
      const schema = await SchemaDefinition.findById(schemaId);
      if (!schema) {
        return res.status(404).send('Schema not found');
      }
      await SchemaDefinition.findByIdAndDelete(schemaId);
      const collectionName = `${schema.name.toLowerCase()}_datas`;
      const DynamicModel = mongoose.models[collectionName];
      if (DynamicModel) {
        await DynamicModel.deleteMany({});
        await mongoose.connection.db.dropCollection(collectionName);
        delete mongoose.models[collectionName];
      }
      res.redirect('/schemas');
    } catch (error) {
      console.error('Error deleting schema:', error);
      res.status(500).send('Internal Server Error');
    }
  }
};

module.exports = SchemaController;
