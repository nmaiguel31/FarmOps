const express = require('express');

const router = express.Router();

const protect = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/roles');

const {
  createZone,
  getZones,
  getZoneById,
  updateZone,
  deleteZone
} = require('../controllers/zoneController');

router.get('/', protect, authorizeRoles(ROLES.ADMINISTRATOR, ROLES.FARM_MANAGER, ROLES.FIELD_OPERATOR), getZones);

router.get('/:id', protect, authorizeRoles(ROLES.ADMINISTRATOR, ROLES.FARM_MANAGER, ROLES.FIELD_OPERATOR), getZoneById);

router.post('/', protect, authorizeRoles(ROLES.ADMINISTRATOR, ROLES.FARM_MANAGER, ROLES.FIELD_OPERATOR), createZone);

router.put('/:id', protect, authorizeRoles(ROLES.ADMINISTRATOR, ROLES.FARM_MANAGER, ROLES.FIELD_OPERATOR), updateZone);

router.delete('/:id', protect, authorizeRoles(ROLES.ADMINISTRATOR, ROLES.FARM_MANAGER), deleteZone);

module.exports = router;
