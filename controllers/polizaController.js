const { Op } = require('sequelize');
const { Poliza, Obra, Aseguradora } = require('../models');
const { TIPOS_POLIZA, ETAPAS_CADENA } = require('../config/polizaTypes');

function validarReemplazo(polizaAnterior, obraId, tipo) {
  if (!polizaAnterior) throw new Error('La póliza anterior seleccionada no existe.');
  if (String(polizaAnterior.obraId) !== String(obraId)) {
    throw new Error('Solo se puede reemplazar una póliza de la misma obra.');
  }
  if (polizaAnterior.estado !== 'Vigente') {
    throw new Error('La póliza seleccionada ya no está vigente.');
  }

  const etapaNueva = ETAPAS_CADENA[tipo];
  const etapaAnterior = ETAPAS_CADENA[polizaAnterior.tipo];
  if (!etapaNueva || !etapaAnterior || etapaAnterior >= etapaNueva) {
    throw new Error('La póliza anterior debe pertenecer a una etapa previa de la cadena.');
  }
}

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
  const candidatas = await Poliza.findAll({
    where: { estado: 'Vigente', tipo: { [Op.in]: Object.keys(ETAPAS_CADENA) } },
    include: [{ model: Obra, as: 'obra' }],
    order: [['fechaEmision', 'DESC']]
  });
  res.render('polizas/form', {
    title: 'Nueva Póliza', poliza: null, obras, aseguradoras, candidatas,
    tiposPoliza: TIPOS_POLIZA, etapasCadena: ETAPAS_CADENA
  });
};

exports.crear = async (req, res) => {
  try {
    const { numero, tipo, obraId, aseguradoraId, tomador, monto, moneda, fechaEmision, fechaVencimiento, observaciones } = req.body;
    const archivoPdf = req.file ? `/uploads/polizas/${req.file.filename}` : null;
    const reemplazaAId = req.body.reemplazaAId || null;

    await Poliza.sequelize.transaction(async transaction => {
      let anterior = null;
      if (reemplazaAId) {
        anterior = await Poliza.findByPk(reemplazaAId, { transaction });
        validarReemplazo(anterior, obraId, tipo);
      }

      await Poliza.create({
        numero, tipo, obraId, aseguradoraId, tomador, monto, moneda,
        fechaEmision, fechaVencimiento, observaciones, archivoPdf,
        reemplazaAId: anterior ? anterior.id : null
      }, { transaction });

      if (anterior) {
        await anterior.update({ estado: 'Pendiente de cancelación' }, { transaction });
      }
    });

    req.session.flash = {
      type: 'success',
      msg: reemplazaAId
        ? 'Póliza creada. La póliza anterior quedó pendiente de cancelación.'
        : 'Póliza creada correctamente.'
    };
    res.redirect('/polizas');
  } catch (error) {
    console.error(error);
    req.session.flash = { type: 'danger', msg: error.message || 'Error al crear la póliza.' };
    res.redirect('/polizas/nueva');
  }
};

exports.mostrarEdicion = async (req, res) => {
  const poliza = await Poliza.findByPk(req.params.id);
  if (!poliza) return res.redirect('/polizas');

  const obras = await Obra.findAll({ order: [['nombre', 'ASC']] });
  const aseguradoras = await Aseguradora.findAll({ order: [['razonSocial', 'ASC']] });
  res.render('polizas/form', {
    title: 'Editar Póliza', poliza, obras, aseguradoras, candidatas: [],
    tiposPoliza: TIPOS_POLIZA, etapasCadena: ETAPAS_CADENA
  });
};

exports.actualizar = async (req, res) => {
  try {
    const poliza = await Poliza.findByPk(req.params.id);
    if (!poliza) return res.redirect('/polizas');

    const { numero, tipo, obraId, aseguradoraId, tomador, monto, moneda, fechaEmision, fechaVencimiento, estado, observaciones } = req.body;

    const datosActualizados = {
      numero, tipo, obraId, aseguradoraId, tomador, monto, moneda,
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
    await Poliza.sequelize.transaction(async transaction => {
      const poliza = await Poliza.findByPk(req.params.id, { transaction });
      if (poliza && poliza.reemplazaAId) {
        const anterior = await Poliza.findByPk(poliza.reemplazaAId, { transaction });
        if (anterior && anterior.estado === 'Pendiente de cancelación') {
          await anterior.update({ estado: 'Vigente' }, { transaction });
        }
      }
      await Poliza.destroy({ where: { id: req.params.id }, transaction });
    });
    req.session.flash = { type: 'success', msg: 'Póliza eliminada.' };
  } catch (error) {
    console.error(error);
    req.session.flash = { type: 'danger', msg: 'Error al eliminar la póliza.' };
  }
  res.redirect('/polizas');
};

exports.confirmarCancelacion = async (req, res) => {
  try {
    const poliza = await Poliza.findByPk(req.params.id);
    if (!poliza || poliza.estado !== 'Pendiente de cancelación') {
      req.session.flash = { type: 'warning', msg: 'La póliza ya no está pendiente de cancelación.' };
    } else {
      await poliza.update({ estado: 'Cancelada' });
      req.session.flash = { type: 'success', msg: 'Cancelación registrada correctamente.' };
    }
  } catch (error) {
    console.error(error);
    req.session.flash = { type: 'danger', msg: 'No se pudo registrar la cancelación.' };
  }
  res.redirect(req.get('referer') || '/');
};
