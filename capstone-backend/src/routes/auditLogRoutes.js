const express = require('express');

const router = express.Router();

const protect = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/roles');
const {
  createClientAuditLog,
  getAuditLogs
} = require('../controllers/auditLogController');

router.get('/', protect, authorizeRoles(ROLES.ADMINISTRATOR), getAuditLogs);
router.post('/', protect, createClientAuditLog);

module.exports = router;
