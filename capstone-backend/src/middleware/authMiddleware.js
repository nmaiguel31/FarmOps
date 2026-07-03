// src/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const logEvent = require('../utils/logger');
const { normalizeRole } = require('../config/roles');

const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = {
        ...decoded,
        role: normalizeRole(decoded.role)
      };

      return next();

    } catch (error) {

      logEvent('warn', 'UNAUTHORIZED_ACCESS', {
        endpoint: req.originalUrl,
        method: req.method,
        ip: req.ip,
        reason: 'Invalid token'
      });

      return res.status(401).json({
        message: 'Not authorized, token failed'
      });

    }
  }

  logEvent('warn', 'UNAUTHORIZED_ACCESS', {
    endpoint: req.originalUrl,
    method: req.method,
    ip: req.ip,
    reason: 'Missing token'
  });

  return res.status(401).json({
    message: 'Not authorized, no token'
  });

};

module.exports = protect;
