const AppError = require('../utils/AppError');

// 404 handler for unmatched routes.
function notFound(req, _res, next) {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

module.exports = notFound;
