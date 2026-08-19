const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Obra = require('./Obra');
const Aseguradora = require('./Aseguradora');

const Poliza = sequelize.define('Poliza', {
  numero: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  tipo: {
    type: DataTypes.STRING,
    allowNull: false // Cumplimiento de Contrato, Anticipo Financiero, Fondo de Reparo, Impugnación, etc.
  },
  monto: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  moneda: {
    type: DataTypes.STRING,
    defaultValue: 'ARS'
  },
  fechaEmision: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  fechaVencimiento: {
    type: DataTypes.DATEONLY
  },
  estado: {
    type: DataTypes.STRING,
    defaultValue: 'Vigente' // Vigente, Vencida, Cancelada, Renovada
  },
  archivoPdf: {
    type: DataTypes.STRING
  },
  observaciones: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'polizas',
  timestamps: true
});

Poliza.belongsTo(Obra, { foreignKey: 'obraId', as: 'obra' });
Obra.hasMany(Poliza, { foreignKey: 'obraId', as: 'polizas' });

Poliza.belongsTo(Aseguradora, { foreignKey: 'aseguradoraId', as: 'aseguradora' });
Aseguradora.hasMany(Poliza, { foreignKey: 'aseguradoraId', as: 'polizas' });

module.exports = Poliza;
