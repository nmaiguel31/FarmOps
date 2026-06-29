const express = require('express');

const router = express.Router();

const protect = require('../middleware/authMiddleware');

const {
  getOperationSignals,
  getActiveOperationSignals,
  createOperationSignal,
  resolveOperationSignal,
  deleteOperationSignal,
  generateOperationSignals,
  evaluateAllOperationSignals,
  evaluateWeatherSignals,
  evaluateNDVISignals,
  evaluateFinancialSignals,
  evaluateLifecycleSignals,
  evaluateFieldSignals
} = require('../controllers/operationSignalController');

router.get('/', protect, getOperationSignals);

router.get('/active', protect, getActiveOperationSignals);

router.post('/', protect, createOperationSignal);

router.post('/generate', protect, generateOperationSignals);

router.post('/evaluate/all', protect, evaluateAllOperationSignals);

router.post('/evaluate/weather', protect, evaluateWeatherSignals);

router.post('/evaluate/ndvi', protect, evaluateNDVISignals);

router.post('/evaluate/financial', protect, evaluateFinancialSignals);

router.post('/evaluate/lifecycle', protect, evaluateLifecycleSignals);

router.post('/evaluate/fields', protect, evaluateFieldSignals);

router.patch('/:id/resolve', protect, resolveOperationSignal);

router.delete('/:id', protect, deleteOperationSignal);

module.exports = router;
