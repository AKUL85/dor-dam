// ─────────────────────────────────────────────────────────────
//  Operational error class. Errors flagged isOperational are
//  expected failures (bad input, unknown store, ...) and are
//  safe to surface to API clients. Everything else is treated
//  as an unexpected programming error.
// ─────────────────────────────────────────────────────────────
class AppError extends Error {
  constructor(message, statusCode = 500, details = undefined) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
    if (details !== undefined) this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details) {
    return new AppError(message, 400, details);
  }

  static notFound(message, details) {
    return new AppError(message, 404, details);
  }

  static internal(message, details) {
    return new AppError(message, 500, details);
  }
}

module.exports = AppError;
