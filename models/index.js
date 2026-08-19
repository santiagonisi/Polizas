const sequelize = require('../config/database');
const Usuario = require('./Usuario');
const Aseguradora = require('./Aseguradora');
const Obra = require('./Obra');
const Poliza = require('./Poliza');

async function initModels() {
  await sequelize.sync();
}

module.exports = {
  sequelize,
  initModels,
  Usuario,
  Aseguradora,
  Obra,
  Poliza
};
