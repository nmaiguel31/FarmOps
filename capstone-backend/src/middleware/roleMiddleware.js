// src/middleware/roleMiddleware.js

const logEvent = require('../utils/logger');
const { normalizeRole } = require('../config/roles');

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    const userRole =
      normalizeRole(req.user?.role);
    const requiredRoles =
      roles.map(role => normalizeRole(role));

    if (!req.user || !requiredRoles.includes(userRole)) {

      logEvent('warn', 'AUTHORIZATION_FAILURE', {
        userId: req.user?.id,
        userRole,
        requiredRoles,
        endpoint: req.originalUrl,
        method: req.method,
        ip: req.ip
      });

      return res.status(403).json({
        message: 'Forbidden: insufficient permissions'
      });
    }

    next();
  };
};

module.exports = authorizeRoles;
