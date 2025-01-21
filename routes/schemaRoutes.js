// routes/schemaRoutes.js
const express = require('express');
const router = express.Router();
const SchemaController = require('../controllers/schemaController');

// Route to display the schema list under a specific program
router.get('/schemas', SchemaController.getSchemaAllList);

// Route to display the schema list under a specific program
router.get('/schemas/:schemaUnderProject', SchemaController.getSchemaList);

// Route to display the new project form
router.get('/schema/:schemaUnderProject', SchemaController.showCreateSchemaForm);

// Route to handle schema creation
router.post('/api/schema', SchemaController.createSchema);

// Route to display the form based on schema(project)
router.get('/form/:schemaId', SchemaController.showDynamicForm);

// Handle form submission with dynamic schema
router.post('/submit/:schemaId', SchemaController.submitDynamicForm);

// View the data for a schema
router.get('/data/:schemaId', SchemaController.viewSchemaData);

// Delete schema and its dynamic data
router.post('/delete/schema/:schemaId', SchemaController.deleteSchema);

module.exports = router;
