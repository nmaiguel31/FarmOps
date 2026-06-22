const express = require('express');

const router = express.Router();

const protect = require('../middleware/authMiddleware');

const {
  createZone,
  getZones,
  getZoneById,
  updateZone,
  deleteZone
} = require('../controllers/zoneController');

router.get('/', protect, getZones);

router.get('/:id', protect, getZoneById);

router.post('/', protect, createZone);

router.put('/:id', protect, updateZone);

router.delete('/:id', protect, deleteZone);

module.exports = router;
