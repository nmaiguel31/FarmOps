// src/middleware/roleMiddleware.js

const logEvent = require('../utils/logger');

const authorizeRoles = (...roles) => {
  return (req, res, next) => {

    if (!req.user || !roles.includes(req.user.role)) {

      logEvent('warn', 'AUTHORIZATION_FAILURE', {
        userId: req.user?.id,
        userRole: req.user?.role,
        requiredRoles: roles,
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