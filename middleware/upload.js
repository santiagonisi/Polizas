const path = require('path');
const multer = require('multer');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads', 'polizas');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `poliza_${timestamp}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  if (file.mimetype === 'application/pdf') {
    return cb(null, true);
  }
  cb(new Error('Solo se permiten archivos PDF'));
}

module.exports = multer({ storage, fileFilter });
