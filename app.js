const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path=require('path');
const ejsMate = require('ejs-mate');
const methodOverride = require('method-override');
const session = require('express-session');
const nepalGeoData = require('@nepalutils/nepal-geodata');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');


const employeeRoutes = require('./routes/employeeRoutes');
const SchemaDefinition = require('./models/schemaDefination');
const Event = require('./models/Events');
const Program = require('./models/Program');
const EventWbenificiary = require('./models/EventWbenificiary');

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

const upload = multer({ dest: 'uploads/' });

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/project_management')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// // Predefined programs
// const programs = [
//   { name: 'agriculture', description: 'Programs related to sustainable agriculture and commercialization.' },
//   { name: 'forest', description: 'Programs focused on the preservation and utilization of forests sustainably.' },
//   { name: 'water', description: 'Programs related to water resource management and conservation.' },
//   { name: 'climate', description: 'Programs addressing climate change adaptation and mitigation.' },
// ];

// // Seed predefined programs
// const seedPrograms = async () => {
//   try {
//     const existingPrograms = await Program.find();
//     if (existingPrograms.length === 0) {
//       await Program.insertMany(programs);
//           console.log('Programs added successfully.');
//     } else {
//       const prog=await Program.find({});
//       console.log(prog);
//     }
//   } catch (err) {
//     console.error('Error seeding programs:', err);
//   }
// };

// Seed programs without closing the connection
// seedPrograms();


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

app.get('/profile', (req, res) => {
  res.render('profile');
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

// Route to display the schema list for all schemas
app.get('/schemas', async (req, res) => {
  try {
    const schemas = await SchemaDefinition.find({});
    res.render('schemaList', { schemas, programName: null, events: [] }); // Pass empty events array
  } catch (error) {
    console.error('Error fetching schemas:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Route to render the form
app.get('/eventb', (req, res) => {
  res.render('eventEbineficiartForm'); // Make sure this matches your EJS filename
});


// Route to post the form
app.post('/submit-event', upload.fields([{ name: 'photographs' }, { name: 'reports' }]), async (req, res) => {
  try {
      const { eventName, eventType, startDate, endDate, venue, nationalLevel, facilitators, beneficiaries } = req.body;
      let cleanedBeneficiaries = Array.isArray(beneficiaries) 
        ? beneficiaries
        : JSON.parse(beneficiaries || '[]');
      cleanedBeneficiaries = cleanedBeneficiaries.filter(beneficiary => beneficiary && beneficiary.name);
      cleanedBeneficiaries.forEach(beneficiary => {
        if (beneficiary.benefitsFromActivity === 'on') {
            beneficiary.benefitsFromActivity = true;
        } else if (beneficiary.benefitsFromActivity === 'off') {
            beneficiary.benefitsFromActivity = false;
        } else if (beneficiary.benefitsFromActivity === 'disabled') {
            beneficiary.benefitsFromActivity = null; // or any value you consider for 'disabled'
        }
        if (beneficiary.disability === 'on') {
            beneficiary.disability = true; // Consider the person as having a disability
        } else if (beneficiary.disability === 'off') {
            beneficiary.disability = false; // Consider the person as not having a disability
        }
        if (!beneficiary.uniqueId) {
            beneficiary.uniqueId = uuidv4(); // Generate a unique ID if not present
        }
    });
      console.log('Cleaned Beneficiaries:', cleanedBeneficiaries);
      const eventWithBeneficiary = new EventWbenificiary({
          eventName,
          eventType,
          startDate,
          endDate,
          venue, // Directly use venue if it's already an object
          nationalLevel,
          facilitators: facilitators ? facilitators.split(',') : [],
          beneficiaries: cleanedBeneficiaries, // Use cleaned beneficiaries data
          photographs: req.files['photographs']?.map(file => file.path),
          reports: req.files['reports']?.map(file => file.path),
      });
      await eventWithBeneficiary.save();
      res.status(201).send('Event created successfully');
  } catch (error) {
      console.error('Error saving event:', error.message);
      res.status(500).send('Error saving event');
  }
});


app.get('/schema/add-event/:projectName', async (req, res) => {
  try {
    const projectName = req.params.projectName;
    const project = await Program.findOne({ name: projectName });
    if (!project) {
      return res.status(404).send(`Project with name "${projectName}" not found.`);
    }
    res.render('eventForm', { projectName, projectId: project._id });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).send('Error fetching project');
  }
});


app.post('/schema/add-event', async (req, res) => {
  try {
    const { title, description, date, location, organizer, status, under_project, attendees } = req.body;
    // Find the Project by name to get its ID
    const project = await Program.findOne({ name: under_project }); // Assuming `Program` is your model for projects
    if (!project) {
      return res.status(400).send(`Project with name "${under_project}" not found.`);
    }
    // Create a new event linked to the Project ID
    const event = new Event({
      title,
      description,
      date,
      location,
      organizer,
      status,
      project_under: project._id, // Use the Project's ObjectId
      attendees: attendees.map(att => ({
        name: att.name,
        gender: att.gender,
        contact: att.contact,
        otherInfo: att.otherInfo || '',
      })),
    });
    // Save the event to the database
    await event.save();
    res.redirect('/'); // Redirect to the desired page after saving
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).send('Error creating event');
  }
});


// Example route for event listing (optional)
app.get('/events', async (req, res) => {
  const events = await Event.find({});
  res.render('events', { events });
});

// get event detail
app.get('/event/:eventId', async (req, res) => {
  const { eventId } = req.params;
  try {
    // Find the event by ID
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).send('Event not found');
    }
    res.render('eventDetail', { event });
  } catch (error) {
    console.error('Error fetching event details:', error);
    res.status(500).send('Internal Server Error');
  }
});

// edit event detail
app.get('/event/edit/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Find the event by its ID
    const event = await Event.findById(id).populate('project_under');
    if (!event) {
      return res.status(404).send('Event not found');
    }
    // Render the form to edit event data
    res.render('editEvent', { event });
  } catch (error) {
    console.error('Error fetching event for editing:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Route to handle the submission of the edit form
app.post('/event/edit/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const { title, description, date, location, organizer, status, attendees } = req.body;

  try {
    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      {
        title,
        description,
        date,
        location,
        organizer,
        status,
        attendees, // This will now be an array of objects
      },
      { new: true }
    );

    if (!updatedEvent) {
      return res.status(404).send('Event not found');
    }

    res.redirect(`/event/${eventId}`); // Redirect to event details page
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Route to handle event deletion
app.post('/event/delete/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Find the event by ID and delete it
    const event = await Event.findByIdAndDelete(id);

    if (!event) {
      return res.status(404).send('Event not found');
    }

    // Redirect to the list of events after deletion
    res.redirect('/events');
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).send('Internal Server Error');
  }
});



// Route to display the schema list under a specific program
app.get('/schemas/:schemaUnderProject', async (req, res) => {
  const { schemaUnderProject } = req.params;
  try {
    // First, find the program by name to get the ObjectId
    const program = await Program.findOne({ name: schemaUnderProject });

    if (!program) {
      return res.status(404).render('error', { message: `Program '${schemaUnderProject}' not found` });
    }

    // Now, use the program's ObjectId for the query
    const schemas = await SchemaDefinition.find({ under_project: program._id });
    console.log('Program ID:', program._id);
    // Fetch the events linked to this program
    const events = await Event.find({ under_project: program._id });
    

    // Render the schema list view with the program name, program ID, schemas, and events
    res.render('schemaList', {
      schemas,
      events,
      programName: program.name, // Pass the program name to the view
      programId: program._id,   // Pass the program ID to the view
    });
  } catch (error) {
    console.error('Error fetching schemas:', error);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
});





// Route to display the new project form
app.get('/schema/:schemaUnderProject', (req, res) => {
  const { schemaUnderProject } = req.params;
  res.render('createSchema', { schemaUnderProject });
});


app.post('/api/schema', async (req, res) => {
  try {
    const { name, fields, schemaUnderProject } = req.body;

    if (!name || !schemaUnderProject || !fields || fields.length === 0) {
      return res.status(400).send('Schema name, fields, and project are required.');
    }

    const fieldArray = Array.isArray(fields) ? fields : Object.values(fields);
    
    const sanitizedFields = fieldArray.map((field, index) => {
      // Sanitize options and attendeeFields, default empty if not provided
      const options = Array.isArray(field.options) ? field.options : Object.values(field.options || []);
      const attendeeFields = Array.isArray(field.attendeeFields)
        ? field.attendeeFields
        : Object.values(field.attendeeFields || []);
      
      // Field name and type validation
      if (!field.fieldName || !field.fieldType) {
        throw new Error(`Field name and field type are required for field at index ${index}`);
      }

      // Sanitize options (trim empty values)
      const sanitizedOptions = options.map((opt) => opt.trim()).filter(Boolean);

      // Sanitize attendee fields
      const sanitizedAttendeeFields = attendeeFields.map((attendee) => ({
        fieldName: attendee.fieldName?.trim(),
        fieldType: attendee.fieldType?.trim(),
      })).filter(attendee => attendee.fieldName && attendee.fieldType);

      return {
        fieldName: field.fieldName.trim(),
        fieldType: field.fieldType.trim(),
        required: field.required === 'on' || field.required === true, // Convert checkbox to boolean
        options: sanitizedOptions,
        attendeeFields: sanitizedAttendeeFields,
      };
    });

    // Save the schema to the database
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
});




// Route to display the form based on schema(project)
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


app.post('/delete/schema/:schemaId', async (req, res) => {
  const { schemaId } = req.params;
  try {
    const schema = await SchemaDefinition.findById(schemaId);
    if (!schema) {
      return res.status(404).send('Schema not found');
    }
    await SchemaDefinition.findByIdAndDelete(schemaId);
    const collectionName = `${schema.name.toLowerCase()}_datas`;
    const DynamicModel = getDynamicModel(collectionName);
    await DynamicModel.deleteMany({}); // Delete all documents in the collection
    const collections = await mongoose.connection.db.listCollections({ name: collectionName }).toArray();
    if (collections.length === 0) {
      console.log(`Collection ${collectionName} does not exist.`);
    } else {
      await mongoose.connection.db.dropCollection(collectionName);
      console.log(`Collection ${collectionName} dropped successfully.`);
    }
    delete mongoose.models[collectionName];
    res.redirect('/schemas');
  } catch (error) {
    console.error('Error deleting schema:', error);
    res.status(500).send('Internal Server Error');
  }
});


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
