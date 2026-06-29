// ─────────────────────────────────────────────────────────────
//  Scraper service — orchestrates a scraping run end to end:
//    registry → run scraper → transform → (persist) → (save).
//  This is the single entry point used by both the HTTP layer
//  and the CLI, so behaviour stays identical across interfaces.
// ─────────────────────────────────────────────────────────────
const config = require('../config/env');
const logger = require('../utils/logger').child({ scope: 'scraperService' });
const { createScraper, listStoreKeys } = require('../scraper/registry');
const { transformResult } = require('../scraper/transformers/productTransformer');
const { persistRecords } = require('./persistenceService');

/** List every store the system can scrape. */
function getAvailableStores() {
  return listStoreKeys();
}

/**
 * Scrape a single store.
 * @param {string} storeKey
 * @param {object} options { persist, saveToDisk, overrides }
 */
async function scrapeStore(storeKey, options = {}) {
  const persist = options.persist ?? false;
  const saveToDisk = options.saveToDisk ?? config.scraper.saveToDisk;

  const scraper = createScraper(storeKey, options.overrides || {});
  logger.info(`Running scraper "${storeKey}"`, { persist, saveToDisk });

  const result = await scraper.run();

  let savedTo = null;
  if (saveToDisk) savedTo = scraper.saveToJson();

  const { records, invalid } = transformResult(result);

  let persistence = { skipped: true, created: 0, failed: 0, total: records.length };
  if (persist) persistence = await persistRecords(records);

  return {
    store: storeKey,
    summary: {
      totalFound: result.totalFound,
      totalErrors: result.totalErrors,
      totalSkipped: result.totalSkipped,
      durationMs: result.durationMs,
      invalidRecords: invalid.length,
    },
    persistence,
    savedTo,
    products: result.products,
    errors: result.errors,
    invalid,
  };
}

/**
 * Scrape several stores sequentially (politeness > raw speed).
 * A failure in one store never stops the others.
 */
async function scrapeStores(storeKeys, options = {}) {
  const keys = storeKeys && storeKeys.length ? storeKeys : getAvailableStores();
  const results = [];

  for (const key of keys) {
    try {
      results.push(await scrapeStore(key, options));
    } catch (err) {
      logger.error(`Scraper "${key}" failed`, { error: err.message });
      results.push({ store: key, error: err.message });
    }
  }

  return results;
}

module.exports = { getAvailableStores, scrapeStore, scrapeStores };
