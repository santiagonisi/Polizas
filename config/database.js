require('dotenv').config();
const path = require('path');
const { Sequelize } = require('sequelize');

const storagePath = process.env.DB_STORAGE || path.join(__dirname, '..', 'database', 'polizas.db');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: storagePath,
  logging: false
});

module.exports = sequelize;
