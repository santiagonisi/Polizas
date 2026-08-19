const { Obra } = require('../models');

exports.index = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const perPage = 10;
  const { count, rows } = await Obra.findAndCountAll({
    order: [['id', 'DESC']],
    limit: perPage,
    offset: (page - 1) * perPage
  });
  const totalPages = Math.max(Math.ceil(count / perPage), 1);
  res.render('obras/index', { title: 'Obras', obras: rows, page, totalPages, total: count });
};

exports.crear = async (req, res) => {
  try {
    const { nombre, comitente, ubicacion, montoContrato, fechaInicio, fechaFin } = req.body;
    await Obra.create({ nombre, comitente, ubicacion, montoContrato, fechaInicio, fechaFin });
    req.session.flash = { type: 'success', msg: 'Obra agregada correctamente.' };
  } catch (error) {
    console.error(error);
    req.session.flash = { type: 'danger', msg: 'Error al agregar la obra.' };
  }
  res.redirect('/obras');
};

exports.actualizar = async (req, res) => {
  try {
    const obra = await Obra.findByPk(req.params.id);
    if (!obra) return res.redirect('/obras');
    const { nombre, comitente, ubicacion, montoContrato, fechaInicio, fechaFin, estado } = req.body;
    await obra.update({ nombre, comitente, ubicacion, montoContrato, fechaInicio, fechaFin, estado });
    req.session.flash = { type: 'success', msg: 'Obra actualizada correctamente.' };
  } catch (error) {
    console.error(error);
    req.session.flash = { type: 'danger', msg: 'Error al actualizar la obra.' };
  }
  res.redirect('/obras');
};

exports.eliminar = async (req, res) => {
  try {
    await Obra.destroy({ where: { id: req.params.id } });
    req.session.flash = { type: 'success', msg: 'Obra eliminada.' };
  } catch (error) {
    console.error(error);
    req.session.flash = { type: 'danger', msg: 'Error al eliminar la obra.' };
  }
  res.redirect('/obras');
};
