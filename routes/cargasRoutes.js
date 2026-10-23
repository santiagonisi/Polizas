const express = require('express');
const controller = require('../controllers/cargasController');
const { upload, validarFirma } = require('../middleware/cargaUpload');

const router = express.Router();
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get('/', asyncHandler(controller.index));
router.get('/plantilla.xlsx', asyncHandler(controller.plantilla));
router.get('/errores.xlsx', asyncHandler(controller.descargarErrores));
router.post('/excel', upload.single('archivo'), validarFirma, asyncHandler(controller.importarExcel));
router.post('/pdf', upload.array('archivos', 10), validarFirma, asyncHandler(controller.importarPDF));
router.post('/errores/rechazar', asyncHandler(controller.descartarLote));
router.get('/:id', asyncHandler(controller.ver));
router.post('/:id', asyncHandler(controller.actualizar));
router.post('/:id/confirmar', asyncHandler(controller.confirmar));
router.post('/:id/rechazar', asyncHandler(controller.rechazar));

module.exports = router;