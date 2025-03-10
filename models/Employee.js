const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize) => {
  const Employee = sequelize.define('Employee', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      trim: true,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
      trim: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      trim: true,
    },
    designation: {
      type: DataTypes.STRING,
      allowNull: false,
      trim: true,
    },
    authorizationLevel: {
      type: DataTypes.ENUM('A', 'S', 'U'), // A = Admin, S = Supervisor, U = User
      allowNull: false,
    },
    dateOfJoining: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    employeeId: {
      type: DataTypes.STRING,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,  // Store hashed password
      allowNull: false,
    },
  }, { timestamps: true });

  // Middleware to generate employeeId and password
  Employee.beforeCreate(async (employee, options) => {
    const count = await Employee.count();
    employee.employeeId = `EMP${(count + 1).toString().padStart(5, '0')}`;

    if (!employee.password) {
      // Generate and hash the password if not provided
      const newPassword = generatePassword();
      employee.password = await bcrypt.hash(newPassword, 10);

      // Optionally send the password to the user's email here if desired
    }
  });

  return Employee;
};

function generatePassword() {
  // Implement password generation logic here
  return 'defaultPassword123';
}