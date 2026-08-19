const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Usuario = sequelize.define('Usuario', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  rol: {
    type: DataTypes.STRING,
    defaultValue: 'usuario' // 'admin' | 'usuario'
  },
  estado: {
    type: DataTypes.STRING,
    defaultValue: 'Activo'
  }
}, {
  tableName: 'usuarios',
  timestamps: true
});

module.exports = Usuario;
