const express = require('express');

const router = express.Router();

const protect = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/roles');

const {
  getAdminData
} = require('../controllers/adminController');

router.get(
  '/',
  protect,
  authorizeRoles(ROLES.ADMINISTRATOR),
  getAdminData
);

module.exports = router;
