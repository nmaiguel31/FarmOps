const express = require('express');

const router = express.Router();

const protect = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/roles');

const {
  createCrop,
  getCrops,
  deleteCrop,
  updateCrop
} = require('../controllers/cropController');

// Protected routes
router.post('/', protect, authorizeRoles(ROLES.ADMINISTRATOR, ROLES.FARM_MANAGER), createCrop);

router.get('/', protect, authorizeRoles(ROLES.ADMINISTRATOR, ROLES.FARM_MANAGER, ROLES.FIELD_OPERATOR), getCrops);

router.delete('/:id', protect, authorizeRoles(ROLES.ADMINISTRATOR, ROLES.FARM_MANAGER), deleteCrop);

router.put('/:id', protect, authorizeRoles(ROLES.ADMINISTRATOR, ROLES.FARM_MANAGER), updateCrop);

module.exports = router;
