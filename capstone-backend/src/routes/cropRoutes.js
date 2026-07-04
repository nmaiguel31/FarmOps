const express = require('express');

const router = express.Router();

const protect = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { FARM_WRITE_ROLES, READ_ALL_FARM_ROLES } = require('../config/roles');

const {
  createCrop,
  getCrops,
  deleteCrop,
  updateCrop
} = require('../controllers/cropController');

// Protected routes
router.post('/', protect, authorizeRoles(...FARM_WRITE_ROLES), createCrop);

router.get('/', protect, authorizeRoles(...READ_ALL_FARM_ROLES), getCrops);

router.delete('/:id', protect, authorizeRoles(...FARM_WRITE_ROLES), deleteCrop);

router.put('/:id', protect, authorizeRoles(...FARM_WRITE_ROLES), updateCrop);

module.exports = router;
