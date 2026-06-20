// ─────────────────────────────────────────────────────────────
//  Scraper registry — the single place new stores are wired in.
//  Adding a new website is a one-line change here; the rest of
//  the system (services, API, CLI) discovers it automatically.
// ─────────────────────────────────────────────────────────────
const AppError = require('../utils/AppError');
const StarTechScraper = require('./stores/StarTechScraper');

// storeKey -> Scraper class
const SCRAPERS = {
  [StarTechScraper.storeKey]: StarTechScraper,
};

/** List the keys of every registered store. */
function listStoreKeys() {
  return Object.keys(SCRAPERS);
}

/** True if a store key is registered. */
function hasStore(storeKey) {
  return Object.prototype.hasOwnProperty.call(SCRAPERS, storeKey);
}

/**
 * Instantiate a scraper by store key.
 * @throws {AppError} 404 when the store is unknown.
 */
function createScraper(storeKey, overrides = {}) {
  const ScraperClass = SCRAPERS[storeKey];
  if (!ScraperClass) {
    throw AppError.notFound(`Unknown store "${storeKey}"`, {
      availableStores: listStoreKeys(),
    });
  }
  return new ScraperClass(overrides);
}

module.exports = { SCRAPERS, listStoreKeys, hasStore, createScraper };
