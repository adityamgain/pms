const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path=require('path');
const ejsMate = require('ejs-mate');
const methodOverride = require('method-override');
const session = require('express-session');
const nepalGeoData = require('@nepalutils/nepal-geodata');
const axios = require('axios');

const employeeRoutes = require('./routes/employeeRoutes');
const SchemaDefinition = require('./models/schemaDefination');

const app = express();


// Middleware
// engines
app.engine('ejs',ejsMate);
app.set('views', path.join(__dirname,'views'));
app.set('view engine', 'ejs');

// Serve static files
app.use(methodOverride('_method'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.json());
app.use(express.static('data'));


// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/project_management')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Use employee routes
app.use('/employee', employeeRoutes);

// Define getDynamicModel function first
function getDynamicModel(collectionName) {
  try {
    // Return the model if it's already defined
    return mongoose.models[collectionName] || mongoose.model(collectionName, new mongoose.Schema({}, { strict: false }));
  } catch (e) {
    // If model doesn't exist, create a new one
    const dynamicSchema = new mongoose.Schema({}, { strict: false });
    return mongoose.model(collectionName, dynamicSchema);
  }
}



// Routes
app.get('/',async (req, res) => {
  res.render('home');
});

app.get('/agriculture', (req, res) => {
  res.render('agriculture');
});

app.get('/forest', (req, res) => {
  res.render('forest');
});

app.get('/water', (req, res) => {
  res.render('water');
});

app.get('/climate', (req, res) => {
  res.render('climate');
});

// Endpoint to get provinces
app.get('/api/provinces', async (req, res) => {
  try {
    const nepalData = await nepalGeoData('english'); // Fetch data in English
    const provinces = Object.keys(nepalData).map((province) => ({
      name: province, // Province name
    }));
    res.json(provinces); // Return the formatted provinces as JSON
  } catch (error) {
    res.status(500).send('Error fetching provinces');
  }
});



// Endpoint to get districts for a specific province
app.get('/api/districts/:provinceName', async (req, res) => {
  try {
    const provinceName = req.params.provinceName.trim(); // No need for `toLowerCase`
    const nepalData = await nepalGeoData('english'); // Fetch data in English

    // Find the province (case-insensitive match)
    const provinceKey = Object.keys(nepalData).find(
      (key) => key.toLowerCase() === provinceName.toLowerCase()
    );

    if (!provinceKey) {
      return res.status(400).json({ error: 'Invalid province name' });
    }

    // Extract districts
    const districts = Object.keys(nepalData[provinceKey]).map((district) => ({
      name: district.trim(), // Clean names
    }));
    res.json(districts); // Return the districts as JSON
  } catch (error) {
    console.error('Error fetching districts:', error);
    res.status(500).send('Error fetching districts');
  }
});





app.get('/api/municipalities/:districtName', async (req, res) => {
  try {
    const districtName = req.params.districtName.trim(); // Normalize input
    const nepalData = await nepalGeoData('english'); // Fetch Nepal geo data in English

    let municipalities = null;

    // Find the district (case-insensitive match)
    for (const [provinceName, districts] of Object.entries(nepalData)) {
      for (const district in districts) {
        if (district.toLowerCase() === districtName.toLowerCase()) {
          municipalities = districts[district];
          break;
        }
      }
      if (municipalities) break;
    }

    if (!municipalities) {
      return res.status(404).json({ error: 'District not found' });
    }

    // Extract and format municipalities
    const municipalityList = [];
    for (const [type, names] of Object.entries(municipalities)) {
      if (Array.isArray(names)) {
        municipalityList.push(...names);
      }
    }

    if (municipalityList.length === 0) {
      return res.status(404).json({ error: 'No municipalities found' });
    }

    res.json(
      municipalityList.map((name, index) => ({
        id: index + 1,
        name: name.trim(), // Clean names
      }))
    );
  } catch (error) {
    console.error('Error fetching municipality data:', error);
    res.status(500).send('Error fetching municipality data');
  }
});



app.get('/schemas', async (req, res) => {
  const schemas = await SchemaDefinition.find({});
  res.render('schemaList', { schemas });
}); 

// Route to display the schema list
app.get('/schemas/:schemaUnderProject', async (req, res) => {
  const { schemaUnderProject } = req.params;
  try {
    // Filter schemas where the under_project field matches schemaUnderProject
    const schemas = await SchemaDefinition.find({ under_project: schemaUnderProject });
    res.render('schemaList', { schemas });
  } catch (error) {
    console.error('Error fetching schemas:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/schema/:schemaUnderProject', (req, res) => {
  const { schemaUnderProject } = req.params;
  res.render('createSchema', { schemaUnderProject });
});

app.post('/api/schema', async (req, res) => {
  try {
    const { name, fields, schemaUnderProject } = req.body; // Accept schemaUnderProject from the request body
    if (!name || !fields || fields.length === 0 || !schemaUnderProject) {
      return res.status(400).send('Schema name, fields, and project are required.');
    }
    // Ensure fields is an array, convert to array if it comes as an object
    let fieldArray = Array.isArray(fields) ? fields : Object.values(fields);
    // Process the fields array and handle options and required fields
    const sanitizedFields = fieldArray.map((field) => {
      const options = Array.isArray(field.options) ? field.options : []; // Ensure options is an array
      return {
        fieldName: field.fieldName,
        fieldType: field.fieldType,
        required: field.required === 'on', // Convert checkbox value to boolean
        options: options // Handle options array for select and checkbox types
      };
    });
    // Create the schema definition
    const schemaDefinition = new SchemaDefinition({
      name,
      fields: sanitizedFields,
      under_project: schemaUnderProject // Include the project
    });
    // Save to the database
    await schemaDefinition.save();
    res.send('Schema saved successfully!');
  } catch (error) {
    console.error('Error saving schema:', error);
    res.status(500).send('Internal Server Error');
  }
});


// Create dynamic model only if it doesn't exist
function getDynamicModel(collectionName) {
  if (mongoose.models[collectionName]) {
    return mongoose.models[collectionName]; // Return existing model
  } else {
    const dynamicSchema = new mongoose.Schema({}, { strict: false });
    return mongoose.model(collectionName, dynamicSchema); // Create new model
  }
}


// Route to display the form based on schema
app.get('/form/:schemaId', async (req, res) => {
  const { schemaId } = req.params;
  const schema = await SchemaDefinition.findById(schemaId);
  if (!schema) {
    return res.status(404).send('Schema not found');
  }
  res.render('dynamicForm', { schema });
});


// Handle form submission with dynamic schema
app.post('/submit/:schemaId', async (req, res) => {
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
    console.log(submittedData)
    res.send('Form data saved successfully!');
  } catch (err) {
    console.error(err);
    res.status(500).send('An error occurred while saving the data.');
  }
});


// Example usage: Access a dynamic model for a collection
app.get('/data/:schemaId', async (req, res) => {
  const { schemaId } = req.params;
  // Retrieve the schema definition from the database
  const schema = await SchemaDefinition.findById(schemaId);
  if (!schema) {
    return res.status(404).send('Schema not found');
  }
  // Create or get the dynamic model for the collection
  const collectionName = `${schema.name.toLowerCase()}_data`;
  const DynamicModel = getDynamicModel(collectionName);
  // Fetch the data from the dynamic model
  const data = await DynamicModel.find({});
  res.render('viewData', { schema, data });
});


// Route to delete schema and its associated data
app.post('/delete/schema/:schemaId', async (req, res) => {
  const { schemaId } = req.params;
  try {
    // Find the schema definition by ID
    const schema = await SchemaDefinition.findById(schemaId);
    if (!schema) {
      return res.status(404).send('Schema not found');
    }
    // Delete the schema definition
    await SchemaDefinition.findByIdAndDelete(schemaId);
    // Remove the associated data collection
    const collectionName = `${schema.name.toLowerCase()}_datas`;
    // Check if the model exists and delete the associated data
    const DynamicModel = getDynamicModel(collectionName);
    await DynamicModel.deleteMany({}); // Delete all documents in the collection
    // Drop the collection from the database to ensure it no longer exists
    mongoose.connection.db.dropCollection(collectionName, (err) => {
      if (err) {
        console.error('Error dropping collection:', err);
        return res.status(500).send('Error dropping collection');
      }
    });
    // Clear cached model to avoid conflicts
    delete mongoose.models[collectionName];
    res.send('Schema and associated data deleted successfully!');
  } catch (error) {
    console.error('Error deleting schema:', error);
    res.status(500).send('Internal Server Error');
  }
});



// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
