// ─────────────────────────────────────────────────────────────
//  Scraper controller — thin HTTP layer. Validates input, delegates
//  to the scraper service and shapes the JSON response. No business
//  logic lives here.
// ─────────────────────────────────────────────────────────────
const scraperService = require('../services/scraperService');
const { validateScrapeRequest } = require('../validators/scraperValidator');

/** GET /api/scrapers — list available stores. */
function listStores(_req, res) {
  res.json({ status: 'ok', stores: scraperService.getAvailableStores() });
}

/** POST /api/scrapers/:store/run — scrape a single store. */
async function runStore(req, res) {
  const { storeKey, options } = validateScrapeRequest(req);
  const result = await scraperService.scrapeStore(storeKey, options);

  res.json({
    status: 'ok',
    store: result.store,
    summary: result.summary,
    persistence: result.persistence,
    savedTo: result.savedTo,
    invalid: result.invalid,
    products: result.products,
    errors: result.errors,
  });
}

module.exports = { listStores, runStore };
