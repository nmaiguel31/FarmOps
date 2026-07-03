const express = require('express');

const router = express.Router();

const protect = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/roles');

const {
  createFarm,
  getFarms,
  deleteFarm,
  updateFarm
} = require('../controllers/farmController');

// Protected routes

router.post('/', protect, authorizeRoles(ROLES.ADMINISTRATOR, ROLES.FARM_MANAGER), createFarm);

router.get('/', protect, authorizeRoles(ROLES.ADMINISTRATOR, ROLES.FARM_MANAGER, ROLES.FIELD_OPERATOR), getFarms);

router.delete('/:id', protect, authorizeRoles(ROLES.ADMINISTRATOR, ROLES.FARM_MANAGER), deleteFarm);

router.put('/:id', protect, authorizeRoles(ROLES.ADMINISTRATOR, ROLES.FARM_MANAGER), updateFarm);

module.exports = router;
