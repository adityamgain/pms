const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const Employee = require('./employee')(sequelize);
const Project = require('./project')(sequelize);
const EventWbenificiary = require('./eventWbenificiary')(sequelize);
const Beneficiary = require('./beneficiary')(sequelize);

// Define associations with aliases
Project.hasMany(EventWbenificiary, { foreignKey: 'projectId', as: 'events' });
EventWbenificiary.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

EventWbenificiary.hasMany(Beneficiary, { foreignKey: 'eventId', as: 'beneficiaries' });
Beneficiary.belongsTo(EventWbenificiary, { foreignKey: 'eventId', as: 'event' });

module.exports = {
  sequelize,
  Employee,
  Project,
  EventWbenificiary,
  Beneficiary,
};

