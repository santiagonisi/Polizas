const express = require('express');
const router = express.Router();
const aseguradoraController = require('../controllers/aseguradoraController');

router.get('/', aseguradoraController.index);
router.post('/', aseguradoraController.crear);
router.post('/:id', aseguradoraController.actualizar);
router.post('/:id/eliminar', aseguradoraController.eliminar);

module.exports = router;
