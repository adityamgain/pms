const mongoose = require('mongoose');

// Define employee schema
const employeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  designation: {
    type: String,
    required: true,
    trim: true
  },
  authorizationLevel: {
    type: String,
    enum: ['A', 'S', 'U'], // A = Admin, S = Supervisor, U = User
    required: true
  },
  dateOfJoining: {
    type: Date,
    required: true
  },
  employeeId: {
    type: String,
    unique: true
  },
  password: {
    type: String,  // Store hashed password
    required: true
  }
}, { timestamps: true });

// Middleware to generate employeeId and password
employeeSchema.pre('save', async function (next) {
  if (!this.employeeId) {
    const count = await mongoose.model('Employee').countDocuments();
    this.employeeId = `EMP${(count + 1).toString().padStart(5, '0')}`;
  }

  if (!this.password) {
    // Generate and hash the password if not provided
    const newPassword = generatePassword();
    this.password = await bcrypt.hash(newPassword, 10);

    // Optionally send the password to the user's email here if desired
  }

  next();
});

// Export the model
module.exports = mongoose.model('Employee', employeeSchema);