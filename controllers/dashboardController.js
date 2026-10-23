const { Op } = require('sequelize');
const { Poliza, Obra, Aseguradora } = require('../models');
const { ETAPAS_CADENA } = require('../config/polizaTypes');

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

  const pendientesCancelacion = await Poliza.findAll({
    where: { estado: 'Pendiente de cancelación' },
    include: [
      { model: Obra, as: 'obra' },
      { model: Poliza, as: 'reemplazadaPor', attributes: ['id', 'numero', 'tipo'] }
    ],
    order: [['updatedAt', 'DESC']]
  });

  const activasCadena = await Poliza.findAll({
    where: {
      estado: 'Vigente',
      tipo: { [Op.in]: Object.keys(ETAPAS_CADENA) }
    },
    include: [{ model: Obra, as: 'obra' }],
    order: [['fechaEmision', 'ASC']]
  });
  const posiblesSolapamientos = activasCadena.flatMap(poliza => {
    const sucesora = activasCadena
      .filter(otra => String(otra.obraId) === String(poliza.obraId) && ETAPAS_CADENA[otra.tipo] > ETAPAS_CADENA[poliza.tipo])
      .sort((a, b) => ETAPAS_CADENA[a.tipo] - ETAPAS_CADENA[b.tipo])[0];
    return sucesora ? [{ poliza, sucesora }] : [];
  });

  res.render('dashboard/index', {
    title: 'Panel de Control',
    totalPolizas,
    totalObras,
    totalAseguradoras,
    vencenPronto,
    vencidas,
    pendientesCancelacion,
    posiblesSolapamientos
  });
};
