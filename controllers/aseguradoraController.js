const { Aseguradora } = require('../models');

exports.index = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const perPage = 10;
  const { count, rows } = await Aseguradora.findAndCountAll({
    order: [['id', 'DESC']],
    limit: perPage,
    offset: (page - 1) * perPage
  });
  const totalPages = Math.max(Math.ceil(count / perPage), 1);
  const reglas = (aseguradora) => {
    try { return JSON.parse(aseguradora.reglasExtraccion || '{}'); } catch { return {}; }
  };
  res.render('aseguradoras/index', { title: 'Aseguradoras', aseguradoras: rows, page, totalPages, total: count, reglas });
};

function reglasDesdeFormulario(body) {
  const keys = ['aliases', 'numero', 'tomador', 'monto', 'fechaEmision', 'fechaVencimiento', 'tipo'];
  return JSON.stringify(Object.fromEntries(keys.map((key) => [
    key,
    String(body[`etiqueta_${key}`] || '').split(/[\n,;]/).map((label) => label.trim()).filter(Boolean).slice(0, 20)
  ])));
}

exports.crear = async (req, res) => {
  try {
    const { razonSocial, cuit, contacto, telefono, email } = req.body;
    await Aseguradora.create({ razonSocial, cuit, contacto, telefono, email, reglasExtraccion: reglasDesdeFormulario(req.body) });
    req.session.flash = { type: 'success', msg: 'Aseguradora agregada correctamente.' };
  } catch (error) {
    console.error(error);
    req.session.flash = { type: 'danger', msg: 'Error al agregar la aseguradora.' };
  }
  res.redirect('/aseguradoras');
};

exports.actualizar = async (req, res) => {
  try {
    const aseguradora = await Aseguradora.findByPk(req.params.id);
    if (!aseguradora) return res.redirect('/aseguradoras');
    const { razonSocial, cuit, contacto, telefono, email, estado } = req.body;
    await aseguradora.update({ razonSocial, cuit, contacto, telefono, email, estado, reglasExtraccion: reglasDesdeFormulario(req.body) });
    req.session.flash = { type: 'success', msg: 'Aseguradora actualizada correctamente.' };
  } catch (error) {
    console.error(error);
    req.session.flash = { type: 'danger', msg: 'Error al actualizar la aseguradora.' };
  }
  res.redirect('/aseguradoras');
};

exports.eliminar = async (req, res) => {
  try {
    await Aseguradora.destroy({ where: { id: req.params.id } });
    req.session.flash = { type: 'success', msg: 'Aseguradora eliminada.' };
  } catch (error) {
    console.error(error);
    req.session.flash = { type: 'danger', msg: 'Error al eliminar la aseguradora.' };
  }
  res.redirect('/aseguradoras');
};
