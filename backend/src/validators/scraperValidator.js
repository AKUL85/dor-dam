// ─────────────────────────────────────────────────────────────
//  Request validation for scraper endpoints. Lightweight, explicit
//  validation (no external schema dependency) that normalises input
//  and rejects bad requests with a 400 + details.
// ─────────────────────────────────────────────────────────────
const AppError = require('../utils/AppError');
const { hasStore, listStoreKeys } = require('../scraper/registry');

const toBool = (value) => {
  if (typeof value === 'boolean') return value;
  if (value === undefined) return undefined;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const toPositiveInt = (value, field) => {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw AppError.badRequest(`"${field}" must be a positive integer`);
  }
  return n;
};

/** Validate :store param and shared body options for a scrape request. */
function validateScrapeRequest(req) {
  const storeKey = req.params.store;
  if (!hasStore(storeKey)) {
    throw AppError.notFound(`Unknown store "${storeKey}"`, {
      availableStores: listStoreKeys(),
    });
  }

  const body = req.body || {};
  const overrides = {};
  const maxPages = toPositiveInt(body.maxPages, 'maxPages');
  const delayMs = toPositiveInt(body.delayMs, 'delayMs');
  if (maxPages !== undefined) overrides.maxPages = maxPages;
  if (delayMs !== undefined) overrides.delayMs = delayMs;
  if (body.headless !== undefined) overrides.headless = toBool(body.headless);

  return {
    storeKey,
    options: {
      persist: toBool(body.persist) ?? false,
      saveToDisk: body.saveToDisk === undefined ? undefined : toBool(body.saveToDisk),
      overrides,
    },
  };
}

module.exports = { validateScrapeRequest };
