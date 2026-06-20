const express = require('express');

const router = express.Router();

const protect = require('../middleware/authMiddleware');

const {
  createField,
  getFields,
  getFieldById,
  updateField,
  deleteField
} = require('../controllers/fieldController');

router.get('/', protect, getFields);

router.get('/:id', protect, getFieldById);

router.post('/', protect, createField);

router.put('/:id', protect, updateField);

router.delete('/:id', protect, deleteField);

module.exports = router;
