const express = require('express');

const router = express.Router();

const protect = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { FIELD_WRITE_ROLES, FARM_WRITE_ROLES, READ_ALL_FARM_ROLES } = require('../config/roles');

const {
  createField,
  getFields,
  getFieldById,
  updateField,
  deleteField
} = require('../controllers/fieldController');

router.get('/', protect, authorizeRoles(...READ_ALL_FARM_ROLES), getFields);

router.get('/:id', protect, authorizeRoles(...READ_ALL_FARM_ROLES), getFieldById);

router.post('/', protect, authorizeRoles(...FARM_WRITE_ROLES), createField);

router.put('/:id', protect, authorizeRoles(...FIELD_WRITE_ROLES), updateField);

router.delete('/:id', protect, authorizeRoles(...FARM_WRITE_ROLES), deleteField);

module.exports = router;
