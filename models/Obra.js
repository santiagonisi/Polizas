const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Obra = sequelize.define('Obra', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  comitente: {
    type: DataTypes.STRING,
    allowNull: false
  },
  ubicacion: {
    type: DataTypes.STRING
  },
  montoContrato: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  fechaInicio: {
    type: DataTypes.DATEONLY
  },
  fechaFin: {
    type: DataTypes.DATEONLY
  },
  estado: {
    type: DataTypes.STRING,
    defaultValue: 'En ejecución'
  }
}, {
  tableName: 'obras',
  timestamps: true
});

module.exports = Obra;
