// ─────────────────────────────────────────────────────────────
//  BaseScraper — framework for stores scraped from rendered HTML
//  with a real browser (Playwright).
//
//  Stores extend this class and only implement the store-specific
//  selector logic (getProductLinks / parseProduct). Browser
//  lifecycle, retries, timeouts, rate-limiting and crash-safety
//  are handled here; the canonical product shape, de-duplication,
//  result building and disk persistence are inherited from
//  AbstractScraper.
// ─────────────────────────────────────────────────────────────
const AbstractScraper = require('./AbstractScraper');
const Browser = require('./Browser');
const { withRetry } = require('../../utils/retry');

class BaseScraper extends AbstractScraper {
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
          // Stop paginating once a page yields no products.
          if (links.length === 0) break;
          links.forEach((link) => urls.add(link));
          this.log.info(`  Page ${pageNum}: +${links.length} products (total ${urls.size})`);

          currentUrl = await this.getNextPageUrl(page);
          pageNum += 1;
          if (currentUrl) await this.delay(this.delayMs);
        } catch (err) {
          this.log.error(`Failed crawling page ${pageNum} of ${categoryUrl}`, {
            error: err.message,
          });
          this.recordError(currentUrl, 'listing', err.message);
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

        const product = this.addProduct({ ...data, productUrl });
        if (product) {
          this.log.info(`  [${count}/${productUrls.length}] ✓ ${product.name}`, {
            price: product.price,
          });
        }
      } catch (err) {
        // A single failing product must never crash the whole run.
        this.skipped += 1;
        this.recordError(productUrl, 'product', err.message);
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
}

module.exports = BaseScraper;
