// ─────────────────────────────────────────────────────────────
//  BaseScraper — shared framework for ALL store scrapers.
//
//  Every store extends this class and only implements the
//  store-specific selector logic (getProductLinks / parseProduct).
//  Cross-cutting concerns live here and are shared by every store:
//    • browser lifecycle (via Browser)
//    • retries with backoff + per-navigation timeouts
//    • polite rate-limiting delays
//    • structured logging
//    • crash-safety (a single bad product never aborts the run)
// ─────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const config = require('../../config/env');
const logger = require('../../utils/logger');
const Browser = require('./Browser');
const { withRetry } = require('../../utils/retry');
const { delay } = require('../../utils/delay');
const parsers = require('../../utils/parsers');

class BaseScraper {
  constructor(scraperConfig = {}) {
    this.storeName = scraperConfig.storeName || 'Unknown Store';
    this.storeUrl = scraperConfig.storeUrl || '';
    this.listPages = scraperConfig.listPages || [];

    // Operational knobs default to the global config but can be
    // overridden per store.
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
  }

  // ── Shared parsing helpers (delegate to reusable utils) ──────
  cleanPrice(raw) {
    return parsers.cleanPrice(raw);
  }

  cleanText(raw) {
    return parsers.cleanText(raw);
  }

  delay(ms) {
    return delay(ms);
  }

  /**
   * Navigate to a URL with a bounded timeout and automatic retries.
   * Centralised so every store gets identical resilience.
   */
  async goto(page, url, options = {}) {
    return withRetry(
      () =>
        page.goto(url, {
          waitUntil: options.waitUntil || 'domcontentloaded',
          timeout: options.timeout || this.navigationTimeoutMs,
        }),
      {
        retries: this.maxRetries,
        baseDelayMs: this.retryBaseDelayMs,
        label: `goto ${url}`,
        logger: this.log,
      }
    );
  }

  // ── Override these in each store scraper ─────────────────────

  /** Return all product page URLs from a listing/category page. */
  // eslint-disable-next-line no-unused-vars
  async getProductLinks(page, listingUrl) {
    throw new Error('getProductLinks() must be implemented in subclass');
  }

  /** Navigate to a product URL and return a structured object (or null to skip). */
  // eslint-disable-next-line no-unused-vars
  async parseProduct(page, productUrl) {
    throw new Error('parseProduct() must be implemented in subclass');
  }

  /** Return the next pagination URL or null. Override per store if needed. */
  async getNextPageUrl(page) {
    return page
      .$eval(
        '.pagination .next a, a[rel="next"], .pagination li.active + li a',
        (el) => el.href
      )
      .catch(() => null);
  }

  // ── Phase 1: collect unique product URLs ─────────────────────
  async collectProductUrls(page) {
    const urls = new Set();

    for (const categoryUrl of this.listPages) {
      this.log.info(`Crawling category: ${categoryUrl}`);
      let currentUrl = categoryUrl;
      let pageNum = 1;

      while (currentUrl && pageNum <= this.maxPages) {
        try {
          await this.goto(page, currentUrl);
          await this.delay(1000);

          const links = await this.getProductLinks(page, currentUrl);
          links.forEach((link) => urls.add(link));
          this.log.info(`  Page ${pageNum}: +${links.length} products (total ${urls.size})`);

          currentUrl = await this.getNextPageUrl(page);
          pageNum += 1;
          if (currentUrl) await this.delay(this.delayMs);
        } catch (err) {
          this.log.error(`Failed crawling page ${pageNum} of ${categoryUrl}`, {
            error: err.message,
          });
          this.errors.push({ url: currentUrl, stage: 'listing', error: err.message });
          break;
        }
      }
    }

    return [...urls];
  }

  // ── Phase 2: parse each product (crash-safe) ─────────────────
  async parseProducts(page, productUrls) {
    let count = 0;
    for (const productUrl of productUrls) {
      count += 1;
      try {
        await this.delay(this.delayMs);
        const data = await withRetry(() => this.parseProduct(page, productUrl), {
          retries: this.maxRetries,
          baseDelayMs: this.retryBaseDelayMs,
          label: `parseProduct ${productUrl}`,
          logger: this.log,
        });

        if (!data) {
          this.skipped += 1;
          this.log.warn(`  [${count}/${productUrls.length}] skipped (no data)`, { productUrl });
          continue;
        }

        data.scrapedAt = new Date().toISOString();
        data.store = this.storeName;
        data.storeUrl = this.storeUrl;
        this.results.push(data);
        this.log.info(`  [${count}/${productUrls.length}] ✓ ${data.name}`, { price: data.price });
      } catch (err) {
        // A single failing product must never crash the whole run.
        this.skipped += 1;
        this.errors.push({ url: productUrl, stage: 'product', error: err.message });
        this.log.error(`  [${count}/${productUrls.length}] failed`, {
          productUrl,
          error: err.message,
        });
      }
    }
  }

  // ── Main runner ──────────────────────────────────────────────
  async run() {
    const startedAt = Date.now();
    this.log.info(`Starting scrape of ${this.listPages.length} category page(s)`);

    const browser = new Browser({ headless: this.headless, logger: this.log });

    try {
      await browser.launch();
      const page = await browser.newPage();

      const productUrls = await this.collectProductUrls(page);
      this.log.info(`Found ${productUrls.length} unique product URLs. Parsing...`);

      await this.parseProducts(page, productUrls);
    } finally {
      await browser.close();
    }

    const durationMs = Date.now() - startedAt;
    this.log.info('Scrape complete', {
      found: this.results.length,
      skipped: this.skipped,
      errors: this.errors.length,
      durationMs,
    });

    return this.toResult(durationMs);
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

module.exports = BaseScraper;
