const path = require('path');
const { CargaPendiente } = require('../models');

const uploadsDir = path.join(__dirname, '..', 'uploads');

function sendSafeFile(res, filename, directory) {
  const safeName = path.basename(filename || '');
  if (!safeName || safeName !== filename || !/^[a-zA-Z0-9._-]+$/.test(safeName)) {
    return res.sendStatus(404);
  }
  return res.sendFile(path.join(directory, safeName), (error) => {
    if (error && !res.headersSent) res.sendStatus(error.statusCode || 404);
  });
}

exports.poliza = (req, res) => sendSafeFile(res, req.params.filename, path.join(uploadsDir, 'polizas'));

exports.pendiente = async (req, res) => {
  const pending = await CargaPendiente.findByPk(req.params.id);
  if (!pending || pending.tipoCarga !== 'PDF' || !pending.archivo) return res.sendStatus(404);
  return sendSafeFile(res, pending.archivo, path.join(uploadsDir, 'pendientes'));
};

exports.legacyPoliza = (req, res) => sendSafeFile(res, req.params.filename, path.join(uploadsDir, 'polizas'));