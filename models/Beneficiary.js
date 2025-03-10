const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Beneficiary = sequelize.define('Beneficiary', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    uniqueCode: {
      type: DataTypes.STRING,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    age: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    casteEthnicity: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    associatedOrganization: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    povertyStatus: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    benefitsFromActivity: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    disability: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    eventId: {
      type: DataTypes.UUID,
      references: {
        model: 'EventWbenificiaries',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  });


  return Beneficiary;
};