const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Project = sequelize.define('Project', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    projectName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    donor: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    stakeholders: {
      type: DataTypes.ARRAY(DataTypes.STRING),
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isAfterStartDate(value) {
          if (this.startDate > value) {
            throw new Error('End date must be greater than or equal to start date.');
          }
        },
      },
    },
    areaOfAction: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        validate: {
          areValidActions(value) {
            const validActions = ['Nature-based commercial agriculture', 'Sustainable Forest Management', 'Water', 'Climate Change'];
            value.forEach(action => {
              if (!validActions.includes(action)) {
                throw new Error('Invalid area of action');
              }
            });
          },
        },
      },
    reportingPeriod: {
      type: DataTypes.ENUM('Monthly', 'Quarterly', 'Semi-Annually', 'Annually'),
      allowNull: false,
    },
    codeName: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    projectStatus: {
      type: DataTypes.ENUM('Planning', 'Active', 'Completed'),
      defaultValue: 'Planning',
      allowNull: false,
    },
    activities: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
    },
    outcomes: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
    },
    ganttChartData: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  });

  return Project;
};
