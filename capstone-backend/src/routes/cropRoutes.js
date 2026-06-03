const express = require('express');

const router = express.Router();

const protect = require('../middleware/authMiddleware');

const {
  createCrop,
  getCrops,
  deleteCrop,
  updateCrop
} = require('../controllers/cropController');

// Protected routes
router.post('/', protect, createCrop);

router.get('/', protect, getCrops);

router.delete('/:id', protect, deleteCrop);

router.put('/:id', protect, updateCrop);

module.exports = router;