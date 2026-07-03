const express = require('express');

const router = express.Router();

const protect = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/roles');

const {
  createField,
  getFields,
  getFieldById,
  updateField,
  deleteField
} = require('../controllers/fieldController');

router.get('/', protect, authorizeRoles(ROLES.ADMINISTRATOR, ROLES.FARM_MANAGER, ROLES.FIELD_OPERATOR), getFields);

router.get('/:id', protect, authorizeRoles(ROLES.ADMINISTRATOR, ROLES.FARM_MANAGER, ROLES.FIELD_OPERATOR), getFieldById);

router.post('/', protect, authorizeRoles(ROLES.ADMINISTRATOR, ROLES.FARM_MANAGER, ROLES.FIELD_OPERATOR), createField);

router.put('/:id', protect, authorizeRoles(ROLES.ADMINISTRATOR, ROLES.FARM_MANAGER, ROLES.FIELD_OPERATOR), updateField);

router.delete('/:id', protect, authorizeRoles(ROLES.ADMINISTRATOR, ROLES.FARM_MANAGER), deleteField);

module.exports = router;
