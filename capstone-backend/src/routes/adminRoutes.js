const express = require('express');

const router = express.Router();

const protect = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

const {
  getAdminData
} = require('../controllers/adminController');

router.get(
  '/',
  protect,
  authorizeRoles('admin'),
  getAdminData
);

module.exports = router;