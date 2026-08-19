const { Op } = require('sequelize');
const { Poliza, Obra, Aseguradora } = require('../models');

exports.index = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = 10;
    const search = (req.query.search || '').trim();

    const where = search
      ? { numero: { [Op.like]: `%${search}%` } }
      : {};

    const { count, rows } = await Poliza.findAndCountAll({
      where,
      include: [
        { model: Obra, as: 'obra' },
        { model: Aseguradora, as: 'aseguradora' }
      ],
      order: [['fechaVencimiento', 'ASC']],
      limit: perPage,
      offset: (page - 1) * perPage
    });

    const totalPages = Math.max(Math.ceil(count / perPage), 1);
    const hoy = new Date();

    res.render('polizas/index', {
      title: 'Pólizas',
      polizas: rows,
      total: count,
      page,
      totalPages,
      search,
      hoy
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al listar pólizas');
  }
};

exports.mostrarFormulario = async (req, res) => {
  const obras = await Obra.findAll({ where: { estado: 'En ejecución' }, order: [['nombre', 'ASC']] });
  const aseguradoras = await Aseguradora.findAll({ where: { estado: 'Activo' }, order: [['razonSocial', 'ASC']] });
  res.render('polizas/form', { title: 'Nueva Póliza', poliza: null, obras, aseguradoras });
};

exports.crear = async (req, res) => {
  try {
    const { numero, tipo, obraId, aseguradoraId, monto, moneda, fechaEmision, fechaVencimiento, observaciones } = req.body;
    const archivoPdf = req.file ? `/uploads/polizas/${req.file.filename}` : null;

    await Poliza.create({
      numero, tipo, obraId, aseguradoraId, monto, moneda,
      fechaEmision, fechaVencimiento, observaciones, archivoPdf
    });

    req.session.flash = { type: 'success', msg: 'Póliza creada correctamente.' };
    res.redirect('/polizas');
  } catch (error) {
    console.error(error);
    req.session.flash = { type: 'danger', msg: 'Error al crear la póliza.' };
    res.redirect('/polizas/nueva');
  }
};

exports.mostrarEdicion = async (req, res) => {
  const poliza = await Poliza.findByPk(req.params.id);
  if (!poliza) return res.redirect('/polizas');

  const obras = await Obra.findAll({ order: [['nombre', 'ASC']] });
  const aseguradoras = await Aseguradora.findAll({ order: [['razonSocial', 'ASC']] });
  res.render('polizas/form', { title: 'Editar Póliza', poliza, obras, aseguradoras });
};

exports.actualizar = async (req, res) => {
  try {
    const poliza = await Poliza.findByPk(req.params.id);
    if (!poliza) return res.redirect('/polizas');

    const { numero, tipo, obraId, aseguradoraId, monto, moneda, fechaEmision, fechaVencimiento, estado, observaciones } = req.body;

    const datosActualizados = {
      numero, tipo, obraId, aseguradoraId, monto, moneda,
      fechaEmision, fechaVencimiento, estado, observaciones
    };

    if (req.file) {
      datosActualizados.archivoPdf = `/uploads/polizas/${req.file.filename}`;
    }

    await poliza.update(datosActualizados);

    req.session.flash = { type: 'success', msg: 'Póliza actualizada correctamente.' };
    res.redirect('/polizas');
  } catch (error) {
    console.error(error);
    req.session.flash = { type: 'danger', msg: 'Error al actualizar la póliza.' };
    res.redirect('/polizas');
  }
};

exports.eliminar = async (req, res) => {
  try {
    await Poliza.destroy({ where: { id: req.params.id } });
    req.session.flash = { type: 'success', msg: 'Póliza eliminada.' };
  } catch (error) {
    console.error(error);
    req.session.flash = { type: 'danger', msg: 'Error al eliminar la póliza.' };
  }
  res.redirect('/polizas');
};
