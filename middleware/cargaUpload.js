const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, callback) => {
    const extension = file.originalname.toLowerCase().split('.').pop();
    const allowed = (extension === 'pdf' && file.mimetype === 'application/pdf') ||
      (extension === 'xlsx' && [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/octet-stream'
      ].includes(file.mimetype));
    callback(allowed ? null : new Error('Subí un PDF o un Excel .xlsx.'), allowed);
  }
});

function validarFirma(req, res, next) {
  const files = req.files || (req.file ? [req.file] : []);
  if (!files.length) return res.status(400).send('Seleccioná un archivo para continuar.');
  const invalid = files.find((file) => {
    const signature = file.buffer.subarray(0, 5).toString('ascii');
    const extension = file.originalname.toLowerCase().split('.').pop();
    return extension === 'pdf' ? signature !== '%PDF-' : !signature.startsWith('PK');
  });
  if (invalid) return res.status(400).send('El contenido no coincide con el tipo de archivo seleccionado.');
  next();
}

module.exports = { upload, validarFirma };