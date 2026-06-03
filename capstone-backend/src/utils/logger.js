const logEvent = (level, event, details = {}) => {
  const log = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...details
  };

  console.log(JSON.stringify(log, null, 2));
};

module.exports = logEvent;