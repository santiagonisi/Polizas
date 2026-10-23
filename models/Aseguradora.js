const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Aseguradora = sequelize.define('Aseguradora', {
  razonSocial: {
    type: DataTypes.STRING,
    allowNull: false
  },
  cuit: {
    type: DataTypes.STRING
  },
  contacto: {
    type: DataTypes.STRING
  },
  telefono: {
    type: DataTypes.STRING
  },
  email: {
    type: DataTypes.STRING
  },
  reglasExtraccion: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '{}'
  },
  estado: {
    type: DataTypes.STRING,
    defaultValue: 'Activo'
  }
}, {
  tableName: 'aseguradoras',
  timestamps: true
});

module.exports = Aseguradora;
