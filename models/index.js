const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');
const Usuario = require('./Usuario');
const Aseguradora = require('./Aseguradora');
const Obra = require('./Obra');
const Poliza = require('./Poliza');
const CargaPendiente = require('./CargaPendiente');

async function initModels() {
  await sequelize.sync();

  const queryInterface = sequelize.getQueryInterface();
  const columns = await queryInterface.describeTable('polizas');
  if (!columns.reemplazaAId) {
    await queryInterface.addColumn('polizas', 'reemplazaAId', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'polizas', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  }

  if (!columns.tomador) {
    await queryInterface.addColumn('polizas', 'tomador', {
      type: DataTypes.STRING,
      allowNull: true
    });
  }

  const insurerColumns = await queryInterface.describeTable('aseguradoras');
  if (!insurerColumns.reglasExtraccion) {
    await queryInterface.addColumn('aseguradoras', 'reglasExtraccion', {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '{}'
    });
  }
}

module.exports = {
  sequelize,
  initModels,
  Usuario,
  Aseguradora,
  Obra,
  Poliza,
  CargaPendiente
};
