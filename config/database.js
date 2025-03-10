const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('project_management', 'postgres', 'aytida', {
  host: 'localhost',
  dialect: 'postgres',
  logging: (msg) => {
    if (!msg.includes("Executing (default):")) { 
      console.log(msg); // Log only important messages
    }
  },
});

module.exports = sequelize;