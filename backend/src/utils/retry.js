// ─────────────────────────────────────────────────────────────
//  Generic retry helper with exponential backoff + jitter.
//  Used to make every network/browser interaction resilient to
//  transient failures (timeouts, flaky pages, rate limits).
// ─────────────────────────────────────────────────────────────
const { delay } = require('./delay');
const logger = require('./logger');

const DEFAULTS = {
  retries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  factor: 2,
  jitter: true,
  // By default every error is retryable; callers can narrow this.
  shouldRetry: () => true,
};

/**
 * Run `fn` and retry it on failure with exponential backoff.
 * @param {() => Promise<T>} fn
 * @param {object} options
 * @returns {Promise<T>}
 */
async function withRetry(fn, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const log = opts.logger || logger;
  let attempt = 0;
  let lastError;

  while (attempt <= opts.retries) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      const isLast = attempt === opts.retries;
      if (isLast || !opts.shouldRetry(err, attempt)) break;

      const backoff = Math.min(
        opts.baseDelayMs * opts.factor ** attempt,
        opts.maxDelayMs
      );
      const wait = opts.jitter ? Math.round(backoff * (0.5 + Math.random())) : backoff;

      log.warn(`Attempt ${attempt + 1}/${opts.retries + 1} failed, retrying in ${wait}ms`, {
        label: opts.label,
        error: err.message,
      });

      await delay(wait);
      attempt += 1;
    }
  }

  throw lastError;
}

/**
 * Reject if `promise` does not settle within `ms`.
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} label
 * @returns {Promise<T>}
 */
function withTimeout(promise, ms, label = 'operation') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

module.exports = { withRetry, withTimeout };
