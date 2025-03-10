const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EventWbenificiary = sequelize.define('EventWbenificiary', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    eventName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    outcome: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
    },
    eventType: {
      type: DataTypes.ENUM('Workshop', 'Meeting', 'Training', 'Dialogues', 'Facilities', 'Inputs', 'Infrastructures'),
      allowNull: false,
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
    location: {
        type: DataTypes.GEOMETRY('POINT', 4326), // Explicitly set SRID
        allowNull: false,
      },
    venue: {
        type: DataTypes.JSONB,
        allowNull: true,
    },
    nationalLevel: {
      type: DataTypes.ENUM('National', 'Provincial', 'Local'), // Adjust values as needed
      allowNull: true, // or false, based on your requirement
    },
    facilitators: {
        type: DataTypes.ARRAY(DataTypes.STRING),
    },
    photographs: {
        type: DataTypes.ARRAY(DataTypes.STRING),
    },
    reports: {
        type: DataTypes.ARRAY(DataTypes.STRING),
    },
    location: {
      type: DataTypes.GEOMETRY('POINT', 4326), // Explicitly set SRID 4326 (WGS 84)
      allowNull: false,
    },
    projectId: {
        type: DataTypes.UUID,
        references: {
          model: 'Projects',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    },
});
  
    return EventWbenificiary;
  };