// ─────────────────────────────────────────────────────────────
//  ApiScraper — framework for stores that expose a JSON API (the
//  fastest and most reliable way to scrape when available).
//
//  Stores extend this class and implement only the store-specific
//  bits:
//    • categories            — which catalogue feeds to crawl
//    • fetchPage(cat, n)      — fetch one listing page  -> { items, hasNextPage }
//    • getItemKey(item)       — stable key used for de-duplication
//    • buildProduct(item)     — produce the canonical product object
//
//  Pagination ("page 1, 2, 3 … until no products"), retries,
//  timeouts, polite delays, crash-safety, the canonical product
//  shape, de-duplication and result building are all handled here
//  / inherited from AbstractScraper.
// ─────────────────────────────────────────────────────────────
const AbstractScraper = require('./AbstractScraper');
const { withRetry } = require('../../utils/retry');
const { getJson } = require('../../utils/httpClient');

class ApiScraper extends AbstractScraper {
  constructor(scraperConfig = {}) {
    super(scraperConfig);
    // Subclasses set these (overridable per request via `categories`).
    this.apiBase = scraperConfig.apiBase || '';
    this.categories = scraperConfig.categories || [];
  }

  /** Shared JSON GET with this scraper's retry/timeout settings. */
  async getJson(url, label) {
    return getJson(url, {
      timeoutMs: this.navigationTimeoutMs,
      retries: this.maxRetries,
      baseDelayMs: this.retryBaseDelayMs,
      label: label || `GET ${url}`,
      logger: this.log,
    });
  }

  // ── Override these in each store scraper ─────────────────────

  /**
   * Fetch a single listing page for a category.
   * @returns {Promise<{ items: object[], hasNextPage: boolean }>}
   */
  // eslint-disable-next-line no-unused-vars
  async fetchPage(category, pageNum) {
    throw new Error('fetchPage() must be implemented in subclass');
  }

  /** Stable de-duplication key for a listing item (slug or id). */
  getItemKey(item) {
    return item.slug || item.id || JSON.stringify(item);
  }

  /**
   * Build the canonical product object from a listing item. May make an
   * extra detail request. Return null to skip the item.
   */
  // eslint-disable-next-line no-unused-vars
  async buildProduct(item) {
    throw new Error('buildProduct() must be implemented in subclass');
  }

  // ── Phase 1: paginate every category, collect unique items ───
  async collectItems() {
    const items = [];
    const seen = new Set();

    for (const category of this.categories) {
      this.log.info(`Crawling category: ${category}`);
      let pageNum = 1;

      while (pageNum <= this.maxPages) {
        let pageResult;
        try {
          pageResult = await withRetry(() => this.fetchPage(category, pageNum), {
            retries: this.maxRetries,
            baseDelayMs: this.retryBaseDelayMs,
            label: `fetchPage ${category} #${pageNum}`,
            logger: this.log,
          });
        } catch (err) {
          this.log.error(`Failed fetching page ${pageNum} of ${category}`, {
            error: err.message,
          });
          this.recordError(`${category}#${pageNum}`, 'listing', err.message);
          break;
        }

        const { items: pageItems = [], hasNextPage } = pageResult || {};
        // Stop paginating once a page yields no products.
        if (pageItems.length === 0) break;

        let added = 0;
        for (const item of pageItems) {
          const key = `${category}:${this.getItemKey(item)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          items.push(item);
          added += 1;
        }
        this.log.info(`  Page ${pageNum}: +${added} products (total ${items.length})`);

        if (!hasNextPage) break;
        pageNum += 1;
        await this.delay(this.delayMs);
      }
    }

    return items;
  }

  // ── Phase 2: build each product (crash-safe) ─────────────────
  async buildProducts(items) {
    let count = 0;
    for (const item of items) {
      count += 1;
      try {
        await this.delay(this.delayMs);
        const data = await withRetry(() => this.buildProduct(item), {
          retries: this.maxRetries,
          baseDelayMs: this.retryBaseDelayMs,
          label: `buildProduct ${this.getItemKey(item)}`,
          logger: this.log,
        });

        if (!data) {
          this.skipped += 1;
          this.log.warn(`  [${count}/${items.length}] skipped (no data)`, {
            item: this.getItemKey(item),
          });
          continue;
        }

        const product = this.addProduct(data);
        if (product) {
          this.log.info(`  [${count}/${items.length}] ✓ ${product.name}`, {
            price: product.price,
          });
        }
      } catch (err) {
        // A single failing product must never crash the whole run.
        this.skipped += 1;
        this.recordError(String(this.getItemKey(item)), 'product', err.message);
        this.log.error(`  [${count}/${items.length}] failed`, {
          item: this.getItemKey(item),
          error: err.message,
        });
      }
    }
  }

  // ── Main runner ──────────────────────────────────────────────
  async run() {
    const startedAt = Date.now();
    this.log.info(`Starting API scrape of ${this.categories.length} category feed(s)`);

    const items = await this.collectItems();
    this.log.info(`Found ${items.length} unique products. Fetching details...`);

    await this.buildProducts(items);

    const durationMs = Date.now() - startedAt;
    this.log.info('Scrape complete', {
      found: this.results.length,
      skipped: this.skipped,
      errors: this.errors.length,
      durationMs,
    });

    return this.toResult(durationMs);
  }
}

module.exports = ApiScraper;
