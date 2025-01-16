const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

// View all employees
router.get('/', employeeController.getAllEmployees);

// Show add employee form
router.get('/add', employeeController.showAddEmployeeForm);

// Add employee
router.post('/add', employeeController.addEmployee);

// Show edit employee form
router.get('/edit/:id', employeeController.showEditEmployeeForm);

// Edit employee
router.post('/edit/:id', employeeController.editEmployee);

// Delete employee
router.get('/delete/:id', employeeController.deleteEmployee);

//  reset password
router.post('/reset-password', employeeController.resetPassword);

module.exports = router;
