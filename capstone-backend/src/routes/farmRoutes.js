const express = require('express');

const router = express.Router();

const protect = require('../middleware/authMiddleware');

const {
  createFarm,
  getFarms,
  deleteFarm,
  updateFarm
} = require('../controllers/farmController');

// Protected routes

router.post('/', protect, createFarm);

router.get('/', protect, getFarms);

router.delete('/:id', protect, deleteFarm);

router.put('/:id', protect, updateFarm);

module.exports = router;