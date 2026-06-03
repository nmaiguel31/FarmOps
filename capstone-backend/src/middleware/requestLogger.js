const logEvent = require('../utils/logger');

const requestLogger = (req, res, next) => {

  res.on('finish', () => {

    logEvent('info', 'HTTP_REQUEST', {
      method: req.method,
      endpoint: req.originalUrl,
      statusCode: res.statusCode,
      ip: req.ip
    });

  });

  next();

};

module.exports = requestLogger;