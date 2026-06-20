// ─────────────────────────────────────────────────────────────
//  Centralised environment configuration.
//  Loads .env once, validates/normalises values and exposes a
//  single immutable config object used across the app.
// ─────────────────────────────────────────────────────────────
require('dotenv').config();

const toInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  isProduction: (process.env.NODE_ENV || 'development') === 'production',

  server: {
    port: toInt(process.env.PORT, 4000),
    host: process.env.HOST || '0.0.0.0',
  },

  cors: {
    // Comma separated list of allowed origins, or "*" for all.
    origin: process.env.CORS_ORIGIN || '*',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    // When true, logs are emitted as single-line JSON (good for prod aggregation).
    json: toBool(process.env.LOG_JSON, (process.env.NODE_ENV || 'development') === 'production'),
  },

  database: {
    url: process.env.DATABASE_URL || null,
    // Persistence is only attempted when a DATABASE_URL is configured.
    get enabled() {
      return Boolean(this.url);
    },
  },

  scraper: {
    // Run browser without a visible UI.
    headless: toBool(process.env.SCRAPER_HEADLESS, true),
    // Polite delay between requests (ms).
    delayMs: toInt(process.env.SCRAPER_DELAY_MS, 2000),
    // Max pagination pages crawled per category.
    maxPages: toInt(process.env.SCRAPER_MAX_PAGES, 15),
    // Per-navigation timeout (ms).
    navigationTimeoutMs: toInt(process.env.SCRAPER_NAV_TIMEOUT_MS, 45000),
    // Retry attempts for transient failures.
    maxRetries: toInt(process.env.SCRAPER_MAX_RETRIES, 3),
    retryBaseDelayMs: toInt(process.env.SCRAPER_RETRY_BASE_DELAY_MS, 1000),
    // Persist results to disk in addition to returning them.
    saveToDisk: toBool(process.env.SCRAPER_SAVE_TO_DISK, true),
    outputDir: process.env.SCRAPER_OUTPUT_DIR || './output',
    userAgent:
      process.env.SCRAPER_USER_AGENT ||
      'PhoneAdvisorBD-Bot/1.0 (+https://phoneadvisor.com.bd/bot)',
  },
});

module.exports = config;
