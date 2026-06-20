// Logs each HTTP request with method, path, status and duration.
const logger = require('../utils/logger').child({ scope: 'http' });

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode}`, {
      durationMs: Date.now() - start,
    });
  });
  next();
}

module.exports = requestLogger;
