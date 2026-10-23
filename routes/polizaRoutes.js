const express = require('express');
const router = express.Router();
const polizaController = require('../controllers/polizaController');
const upload = require('../middleware/upload');

router.get('/', polizaController.index);
router.get('/nueva', polizaController.mostrarFormulario);
router.post('/', upload.single('archivoPdf'), polizaController.crear);
router.post('/:id/cancelar', polizaController.confirmarCancelacion);
router.get('/:id/editar', polizaController.mostrarEdicion);
router.post('/:id', upload.single('archivoPdf'), polizaController.actualizar);
router.post('/:id/eliminar', polizaController.eliminar);

module.exports = router;
