// ─────────────────────────────────────────────────────────────
//  Central Express error handler. Operational AppErrors are
//  surfaced with their status/details; anything unexpected is
//  logged in full and returned as a generic 500 so internals are
//  never leaked to clients.
// ─────────────────────────────────────────────────────────────
const AppError = require('../utils/AppError');
const config = require('../config/env');
const logger = require('../utils/logger').child({ scope: 'errorHandler' });

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const isOperational = err instanceof AppError && err.isOperational;
  const statusCode = isOperational ? err.statusCode : 500;

  if (isOperational) {
    logger.warn(`${req.method} ${req.originalUrl} -> ${statusCode}`, { error: err.message });
  } else {
    logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, {
      error: err.message,
      stack: err.stack,
    });
  }

  const body = {
    status: 'error',
    message: isOperational ? err.message : 'Internal Server Error',
  };
  if (isOperational && err.details !== undefined) body.details = err.details;
  if (!config.isProduction && !isOperational) body.stack = err.stack;

  res.status(statusCode).json(body);
}

module.exports = errorHandler;
