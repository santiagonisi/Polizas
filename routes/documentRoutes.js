const express = require('express');
const controller = require('../controllers/documentController');

const router = express.Router();
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get('/polizas/:filename', controller.poliza);
router.get('/pendientes/:id', asyncHandler(controller.pendiente));

module.exports = router;