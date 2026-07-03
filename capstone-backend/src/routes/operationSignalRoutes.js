const express = require('express');

const router = express.Router();

const protect = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/roles');

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

const operationsRoles = [ROLES.ADMINISTRATOR, ROLES.FARM_MANAGER, ROLES.FIELD_OPERATOR];

router.get('/', protect, authorizeRoles(...operationsRoles), getOperationSignals);

router.get('/active', protect, authorizeRoles(...operationsRoles), getActiveOperationSignals);

router.post('/', protect, authorizeRoles(...operationsRoles), createOperationSignal);

router.post('/generate', protect, authorizeRoles(...operationsRoles), generateOperationSignals);

router.post('/evaluate/all', protect, authorizeRoles(...operationsRoles), evaluateAllOperationSignals);

router.post('/evaluate/weather', protect, authorizeRoles(...operationsRoles), evaluateWeatherSignals);

router.post('/evaluate/ndvi', protect, authorizeRoles(...operationsRoles), evaluateNDVISignals);

router.post('/evaluate/financial', protect, authorizeRoles(ROLES.ADMINISTRATOR, ROLES.ACCOUNTANT), evaluateFinancialSignals);

router.post('/evaluate/lifecycle', protect, authorizeRoles(...operationsRoles), evaluateLifecycleSignals);

router.post('/evaluate/fields', protect, authorizeRoles(...operationsRoles), evaluateFieldSignals);

router.patch('/:id/resolve', protect, authorizeRoles(...operationsRoles), resolveOperationSignal);

router.delete('/:id', protect, authorizeRoles(ROLES.ADMINISTRATOR), deleteOperationSignal);

module.exports = router;
