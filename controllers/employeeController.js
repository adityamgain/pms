const bcrypt = require('bcrypt');
const { Employee } = require('../models'); 
const { sendPasswordToEmail } = require('../util/emailUtil'); 

// Generate a random password
function generatePassword(length = 8) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]';
  return Array.from({ length }, () => charset.charAt(Math.floor(Math.random() * charset.length))).join('');
}

// Get all employees
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.findAll();
    res.render('viewEmployees', { employees });
  } catch (err) {
    res.status(500).send(err);
  }
};

// Show add employee form
exports.showAddEmployeeForm = (req, res) => {
  res.render('addEmployee');
};

// Add employee
exports.addEmployee = async (req, res) => {
  try {
    const { name, address, email, designation, authorizationLevel, dateOfJoining } = req.body;

    // Generate a random password
    const newPassword = generatePassword();

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Create a new employee with the hashed password
    const newEmployee = await Employee.create({
      name,
      address,
      email,
      designation,
      authorizationLevel,
      dateOfJoining,
      password: hashedPassword,
    });

    // Send the generated password to the employee's email
    await sendPasswordToEmail(email, newPassword);

    res.redirect('/employee');
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
};

// Show edit employee form
exports.showEditEmployeeForm = async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    res.render('editEmployee', { employee });
  } catch (err) {
    res.status(500).send(err);
  }
};

// Edit employee
exports.editEmployee = async (req, res) => {
  try {
    const { name, address, email, designation, authorizationLevel, dateOfJoining } = req.body;
    await Employee.update(
      { name, address, email, designation, authorizationLevel, dateOfJoining },
      { where: { id: req.params.id } }
    );
    res.redirect('/employee');
  } catch (err) {
    res.status(500).send(err);
  }
};

// Delete employee
exports.deleteEmployee = async (req, res) => {
  try {
    await Employee.destroy({ where: { id: req.params.id } });
    res.redirect('/employee');
  } catch (err) {
    res.status(500).send(err);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email } = req.body; // Extract email from request body

    // Find the employee by email
    const employee = await Employee.findOne({ where: { email } });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Generate a new random password
    const newPassword = generatePassword();

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password in the database
    employee.password = hashedPassword;
    await employee.save();

    // Send the new password via email
    try {
      await sendPasswordToEmail(employee.email, newPassword);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      return res.status(500).json({ message: 'Password reset but failed to send email.' });
    }
    res.status(200).json({ message: 'Password reset successfully. Check your email for the new password.' });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ message: 'Server error' });
  }
};