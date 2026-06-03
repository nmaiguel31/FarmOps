const express = require('express');

const router = express.Router();

const protect = require('../middleware/authMiddleware');

const {
  createFinancialRecord,
  getFinancialRecords,
  deleteFinancialRecord,
  updateFinancialRecord
} = require('../controllers/financialController');

router.post('/', protect, createFinancialRecord);

router.get('/', protect, getFinancialRecords);

router.delete('/:id', protect, deleteFinancialRecord);

router.put('/:id', protect, updateFinancialRecord);

module.exports = router;