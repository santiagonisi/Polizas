const express = require('express');
const router = express.Router();
const obraController = require('../controllers/obraController');

router.get('/', obraController.index);
router.post('/', obraController.crear);
router.post('/:id', obraController.actualizar);
router.post('/:id/eliminar', obraController.eliminar);

module.exports = router;
