const express = require('express');

const router = express.Router();

const protect = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { FARM_WRITE_ROLES, READ_ALL_FARM_ROLES } = require('../config/roles');

const {
  createFarm,
  getFarms,
  deleteFarm,
  updateFarm
} = require('../controllers/farmController');

// Protected routes

router.post('/', protect, authorizeRoles(...FARM_WRITE_ROLES), createFarm);

router.get('/', protect, authorizeRoles(...READ_ALL_FARM_ROLES), getFarms);

router.delete('/:id', protect, authorizeRoles(...FARM_WRITE_ROLES), deleteFarm);

router.put('/:id', protect, authorizeRoles(...FARM_WRITE_ROLES), updateFarm);

module.exports = router;
