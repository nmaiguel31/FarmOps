const express = require('express');

const router = express.Router();

const protect = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/roles');

const {
  createFinancialRecord,
  getFinancialRecords,
  deleteFinancialRecord,
  updateFinancialRecord
} = require('../controllers/financialController');

router.post('/', protect, authorizeRoles(ROLES.ADMINISTRATOR, ROLES.ACCOUNTANT), createFinancialRecord);

router.get('/', protect, authorizeRoles(ROLES.ADMINISTRATOR, ROLES.ACCOUNTANT), getFinancialRecords);

router.delete('/:id', protect, authorizeRoles(ROLES.ADMINISTRATOR, ROLES.ACCOUNTANT), deleteFinancialRecord);

router.put('/:id', protect, authorizeRoles(ROLES.ADMINISTRATOR, ROLES.ACCOUNTANT), updateFinancialRecord);

module.exports = router;
