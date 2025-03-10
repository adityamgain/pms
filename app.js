const express = require('express');
const path = require('path');
const ejsMate = require('ejs-mate');
const methodOverride = require('method-override');
const ejsLayouts = require('express-ejs-layouts');
const sequelize = require('./config/database');
const employeeRoutes = require('./routes/employeeRoutes');
const geoRoutes = require('./routes/geoRoutes');
const eventRoutes = require('./routes/eventRoutes');
const projectRoutes = require('./routes/projectRoutes');
const timesheetRoutes = require("./routes/timesheetRoutes");
const { Employee, Project, EventWbenificiary, Beneficiary } = require('./models');


const app = express();

// Middleware
// engines
app.engine('ejs', ejsMate);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('layout', 'layout'); // Use layout.ejs as the default layout
app.use(ejsLayouts);

// Serve static files
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Synchronize models with the database
sequelize.sync({alter: true})
  .then(() => {
    console.log('Database synchronized');
    // Start the server
    const PORT = 3000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database synchronization error:', err);
  });



// Use employee routes
app.use('/employee', employeeRoutes);
app.use('/api', geoRoutes);
app.use('/', eventRoutes); 
app.use('/projects', projectRoutes);
app.use("/", timesheetRoutes);

// Routes
app.get('/', async (req, res) => {
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
