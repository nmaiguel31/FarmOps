const express = require('express');

const router = express.Router();

const protect = require('../middleware/authMiddleware');

const {
  getOperationSignals,
  getActiveOperationSignals,
  createOperationSignal,
  resolveOperationSignal,
  deleteOperationSignal,
  generateOperationSignals
} = require('../controllers/operationSignalController');

router.get('/', protect, getOperationSignals);

router.get('/active', protect, getActiveOperationSignals);

router.post('/', protect, createOperationSignal);

router.post('/generate', protect, generateOperationSignals);

router.patch('/:id/resolve', protect, resolveOperationSignal);

router.delete('/:id', protect, deleteOperationSignal);

module.exports = router;
