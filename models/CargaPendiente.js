const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CargaPendiente = sequelize.define('CargaPendiente', {
  tipoCarga: {
    type: DataTypes.STRING,
    allowNull: false
  },
  nombreOriginal: {
    type: DataTypes.STRING,
    allowNull: false
  },
  archivo: {
    type: DataTypes.STRING
  },
  estado: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Recibido'
  },
  datos: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '{}'
  },
  errores: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '[]'
  },
  textoExtraido: {
    type: DataTypes.TEXT
  },
  usuarioId: {
    type: DataTypes.INTEGER
  }
}, {
  tableName: 'cargas_pendientes',
  timestamps: true
});

module.exports = CargaPendiente;