const logEvent = require('../utils/logger');

const healthCheck = (req, res) => {

  logEvent('info', 'HEALTH_CHECK', {
    endpoint: req.originalUrl,
    method: req.method
  });

  res.status(200).json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  healthCheck
};