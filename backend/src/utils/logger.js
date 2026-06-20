// ─────────────────────────────────────────────────────────────
//  Lightweight leveled logger with structured context support.
//  Avoids a heavy logging dependency while still providing
//  levels, timestamps, JSON output and child loggers.
// ─────────────────────────────────────────────────────────────
const config = require('../config/env');

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const COLORS = {
  error: '\x1b[31m',
  warn: '\x1b[33m',
  info: '\x1b[36m',
  debug: '\x1b[90m',
  reset: '\x1b[0m',
};

class Logger {
  constructor(context = {}) {
    this.context = context;
    this.threshold = LEVELS[config.logging.level] ?? LEVELS.info;
  }

  // Create a derived logger that always includes the given context.
  child(context = {}) {
    return new Logger({ ...this.context, ...context });
  }

  _write(level, message, meta = {}) {
    if (LEVELS[level] > this.threshold) return;

    const entry = {
      time: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...meta,
    };

    if (config.logging.json) {
      const stream = level === 'error' ? process.stderr : process.stdout;
      stream.write(`${JSON.stringify(entry)}\n`);
      return;
    }

    const scope = this.context.scope ? ` [${this.context.scope}]` : '';
    const color = COLORS[level] || '';
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const line = `${color}${entry.time} ${level.toUpperCase()}${COLORS.reset}${scope} ${message}${extra}`;
    const stream = level === 'error' ? process.stderr : process.stdout;
    stream.write(`${line}\n`);
  }

  error(message, meta) {
    this._write('error', message, meta);
  }

  warn(message, meta) {
    this._write('warn', message, meta);
  }

  info(message, meta) {
    this._write('info', message, meta);
  }

  debug(message, meta) {
    this._write('debug', message, meta);
  }
}

module.exports = new Logger();
module.exports.Logger = Logger;
