// ─────────────────────────────────────────────────────────────
//  AbstractScraper — the common foundation shared by every store
//  scraper, regardless of how it fetches data (rendered HTML via
//  Playwright, or a JSON API over HTTP).
//
//  It owns the cross-cutting concerns that must behave identically
//  across all stores:
//    • operational config (delays, retries, timeouts, max pages)
//    • structured logging
//    • the canonical product shape + de-duplication
//    • run accounting (results / errors / skipped)
//    • the structured result object + optional disk persistence
//
//  Concrete bases (BaseScraper / ApiScraper) implement run().
// ─────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const config = require('../../config/env');
const logger = require('../../utils/logger');
const { delay } = require('../../utils/delay');
const parsers = require('../../utils/parsers');

class AbstractScraper {
  constructor(scraperConfig = {}) {
    this.storeName = scraperConfig.storeName || 'Unknown Store';
    this.storeUrl = scraperConfig.storeUrl || '';
    this.listPages = scraperConfig.listPages || [];

    // Operational knobs default to the global config but can be
    // overridden per store / per request.
    this.delayMs = scraperConfig.delayMs ?? config.scraper.delayMs;
    this.maxPages = scraperConfig.maxPages ?? config.scraper.maxPages;
    this.headless = scraperConfig.headless ?? config.scraper.headless;
    this.navigationTimeoutMs =
      scraperConfig.navigationTimeoutMs ?? config.scraper.navigationTimeoutMs;
    this.maxRetries = scraperConfig.maxRetries ?? config.scraper.maxRetries;
    this.retryBaseDelayMs =
      scraperConfig.retryBaseDelayMs ?? config.scraper.retryBaseDelayMs;

    this.log = logger.child({ scope: this.storeName });

    this.results = [];
    this.errors = [];
    this.skipped = 0;

    // Tracks product URLs already collected so the same product is
    // never emitted twice within a single run.
    this._seenUrls = new Set();
  }

  // ── Shared helpers (delegate to reusable utils) ──────────────
  cleanPrice(raw) {
    return parsers.cleanPrice(raw);
  }

  cleanText(raw) {
    return parsers.cleanText(raw);
  }

  delay(ms) {
    return delay(ms);
  }

  recordError(url, stage, error) {
    this.errors.push({ url: url || null, stage, error });
  }

  /**
   * Normalise a raw scraped product into the canonical shape every
   * store must return, then de-duplicate by product URL and store it.
   * Returns the normalised product, or null when it was a duplicate.
   */
  addProduct(raw) {
    const product = this.normalizeProduct(raw);

    if (product.productUrl) {
      if (this._seenUrls.has(product.productUrl)) {
        this.log.debug('Duplicate product skipped', { productUrl: product.productUrl });
        return null;
      }
      this._seenUrls.add(product.productUrl);
    }

    this.results.push(product);
    return product;
  }

  /**
   * The single source of truth for the product object format.
   * Every scraper produces exactly these fields so downstream
   * consumers (transformer, DB, API responses) are store-agnostic.
   */
  normalizeProduct(raw = {}) {
    const price = this._toIntOrNull(raw.price);
    let originalPrice = this._toIntOrNull(raw.originalPrice);
    // Guard against an "original" price that isn't actually higher.
    if (originalPrice !== null && price !== null && originalPrice <= price) {
      originalPrice = null;
    }

    let discountAmount = this._toIntOrNull(raw.discountAmount);
    let discountPct = this._toIntOrNull(raw.discountPct);
    if (discountAmount === null && originalPrice !== null && price !== null) {
      discountAmount = originalPrice - price;
    }
    if (discountPct === null && discountAmount !== null && originalPrice) {
      discountPct = Math.round((discountAmount / originalPrice) * 100);
    }

    return {
      name: parsers.cleanText(raw.name),
      brand: parsers.cleanText(raw.brand),
      category: parsers.cleanText(raw.category),
      productUrl: raw.productUrl || null,
      imageUrl: raw.imageUrl || null,
      price,
      originalPrice,
      discountAmount,
      discountPct,
      inStock: Boolean(raw.inStock),
      stockStatus: parsers.cleanText(raw.stockStatus),
      shortDescription: parsers.cleanText(raw.shortDescription),
      specs: raw.specs && typeof raw.specs === 'object' ? raw.specs : {},
      keySpecs: raw.keySpecs || {},
      scrapedAt: raw.scrapedAt || new Date().toISOString(),
      store: raw.store || this.storeName,
      storeUrl: raw.storeUrl || this.storeUrl,
    };
  }

  _toIntOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? n : null;
  }

  // ── Concrete bases must implement the actual crawl ───────────
  async run() {
    throw new Error('run() must be implemented by a concrete scraper base');
  }

  // ── Structured result object ─────────────────────────────────
  toResult(durationMs) {
    return {
      store: this.storeName,
      storeUrl: this.storeUrl,
      scrapedAt: new Date().toISOString(),
      durationMs,
      totalFound: this.results.length,
      totalErrors: this.errors.length,
      totalSkipped: this.skipped,
      products: this.results,
      errors: this.errors,
    };
  }

  // ── Optional disk persistence ────────────────────────────────
  saveToJson(outputDir = config.scraper.outputDir) {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const slug = this.storeName.toLowerCase().replace(/\s+/g, '-');

    const dataFile = path.join(outputDir, `${slug}-${timestamp}.json`);
    fs.writeFileSync(dataFile, JSON.stringify(this.toResult(), null, 2), 'utf8');

    if (this.errors.length > 0) {
      const errorFile = path.join(outputDir, `${slug}-errors-${timestamp}.json`);
      fs.writeFileSync(errorFile, JSON.stringify(this.errors, null, 2), 'utf8');
      this.log.info(`Error log saved: ${errorFile}`);
    }

    this.log.info(`Results saved: ${dataFile}`);
    return dataFile;
  }
}

module.exports = AbstractScraper;
