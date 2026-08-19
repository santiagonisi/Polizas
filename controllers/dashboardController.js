const { Op } = require('sequelize');
const { Poliza, Obra, Aseguradora } = require('../models');

exports.index = async (req, res) => {
  const hoy = new Date();
  const en30dias = new Date();
  en30dias.setDate(hoy.getDate() + 30);

  const totalPolizas = await Poliza.count();
  const totalObras = await Obra.count({ where: { estado: 'En ejecución' } });
  const totalAseguradoras = await Aseguradora.count({ where: { estado: 'Activo' } });

  const vencenPronto = await Poliza.findAll({
    where: {
      fechaVencimiento: { [Op.between]: [hoy, en30dias] },
      estado: 'Vigente'
    },
    include: [{ model: Obra, as: 'obra' }, { model: Aseguradora, as: 'aseguradora' }],
    order: [['fechaVencimiento', 'ASC']],
    limit: 10
  });

  const vencidas = await Poliza.count({
    where: { fechaVencimiento: { [Op.lt]: hoy }, estado: 'Vigente' }
  });

  res.render('dashboard/index', {
    title: 'Panel de Control',
    totalPolizas,
    totalObras,
    totalAseguradoras,
    vencenPronto,
    vencidas
  });
};
