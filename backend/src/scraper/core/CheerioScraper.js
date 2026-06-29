// ─────────────────────────────────────────────────────────────
//  CheerioScraper — framework for stores served as static,
//  server-rendered HTML. Pages are fetched with axios and parsed
//  with cheerio (fast and lightweight). If a page cannot be
//  fetched via axios (blocked, or JS-rendered with no usable
//  markup), it transparently falls back to a real browser
//  (Playwright) for that single request.
//
//  Stores extend this class and only implement the store-specific
//  selector logic:
//    • listPages              — category/listing URLs to crawl
//    • getProductLinks($,url) — all product URLs on a listing page
//    • getNextPageUrl($,url)  — next pagination URL (default below)
//    • parseProduct($,url)    — produce the canonical product object
//
//  Pagination, rotating user-agents, retries, timeouts, polite
//  delays, crash-safety, the canonical product shape, de-duplication
//  and result building are handled here / inherited from
//  AbstractScraper.
// ─────────────────────────────────────────────────────────────
const axios = require('axios');
const cheerio = require('cheerio');

const AbstractScraper = require('./AbstractScraper');
const Browser = require('./Browser');
const { withRetry } = require('../../utils/retry');

// A small pool of realistic desktop user-agents, rotated per request
// to reduce the chance of being fingerprinted / rate-limited.
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
];

class CheerioScraper extends AbstractScraper {
  constructor(scraperConfig = {}) {
    super(scraperConfig);
    // Allow falling back to a real browser when axios cannot get
    // usable HTML. On by default; can be disabled per store/request.
    this.enableBrowserFallback = scraperConfig.enableBrowserFallback ?? true;
    this._uaIndex = 0;
    this._browser = null;
  }

  /** Round-robin a user-agent from the pool. */
  pickUserAgent() {
    const ua = USER_AGENTS[this._uaIndex % USER_AGENTS.length];
    this._uaIndex += 1;
    return ua;
  }

  // ── Fetching ─────────────────────────────────────────────────

  /** Fetch raw HTML via axios with rotating UA, timeout and retries. */
  async fetchHtml(url, label) {
    return withRetry(
      async () => {
        const res = await axios.get(url, {
          timeout: this.navigationTimeoutMs,
          maxRedirects: 5,
          // Resolve normally for 2xx/3xx; throw for 4xx/5xx so retry
          // logic can decide whether the failure is transient.
          validateStatus: (status) => status >= 200 && status < 400,
          headers: {
            'User-Agent': this.pickUserAgent(),
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
          },
        });
        return String(res.data || '');
      },
      {
        retries: this.maxRetries,
        baseDelayMs: this.retryBaseDelayMs,
        label: label || `GET ${url}`,
        logger: this.log,
        // Don't retry hard 4xx (except 408/429); they won't self-heal.
        shouldRetry: (err) => {
          const s = err.response ? err.response.status : err.status;
          if (!s) return true;
          if (s === 408 || s === 429) return true;
          return s >= 500;
        },
      }
    );
  }

  /** Fetch fully-rendered HTML via Playwright (fallback path). */
  async fetchRenderedHtml(url, label) {
    if (!this._browser) {
      this._browser = new Browser({ headless: this.headless, logger: this.log });
      await this._browser.launch();
    }
    const page = await this._browser.newPage();
    try {
      await withRetry(
        () =>
          page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: this.navigationTimeoutMs,
          }),
        {
          retries: this.maxRetries,
          baseDelayMs: this.retryBaseDelayMs,
          label: label || `render ${url}`,
          logger: this.log,
        }
      );
      return await page.content();
    } finally {
      await page.close().catch(() => {});
    }
  }

  /**
   * Load a URL into a cheerio instance. Tries axios first; if that
   * fails outright, or the markup looks empty/unusable (per the
   * store's `looksEmpty` hook), retries via a real browser.
   */
  async load(url, label) {
    let html;
    try {
      html = await this.fetchHtml(url, label);
    } catch (err) {
      if (!this.enableBrowserFallback) throw err;
      this.log.warn(`axios fetch failed, falling back to browser`, {
        url,
        error: err.message,
      });
      return cheerio.load(await this.fetchRenderedHtml(url, label));
    }

    let $ = cheerio.load(html);
    if (this.enableBrowserFallback && this.looksEmpty($)) {
      this.log.warn(`axios HTML looks empty, falling back to browser`, { url });
      html = await this.fetchRenderedHtml(url, label);
      $ = cheerio.load(html);
    }
    return $;
  }

  // ── Override these in each store scraper ─────────────────────

  /**
   * Decide whether axios-fetched markup is unusable and a browser
   * render is needed. Default: never (static sites). Override per
   * store to detect JS-rendered placeholders.
   */
  // eslint-disable-next-line no-unused-vars
  looksEmpty($) {
    return false;
  }

  /** Return all product page URLs from a listing/category page. */
  // eslint-disable-next-line no-unused-vars
  async getProductLinks($, listingUrl) {
    throw new Error('getProductLinks() must be implemented in subclass');
  }

  /** Build the canonical product object from a product page (or null to skip). */
  // eslint-disable-next-line no-unused-vars
  async parseProduct($, productUrl) {
    throw new Error('parseProduct() must be implemented in subclass');
  }

  /** Return the next pagination URL or null. Override per store if needed. */
  async getNextPageUrl($, currentUrl) {
    const href =
      $('a[rel="next"]').attr('href') ||
      $('.pagination li.active + li a, .pagination .page-item.active + .page-item a').attr(
        'href'
      ) ||
      null;
    if (!href) return null;
    try {
      const next = new URL(href, currentUrl);
      const root = new URL(currentUrl);
      if (next.origin !== root.origin) return null;
      return next.toString();
    } catch {
      return null;
    }
  }

  // ── Phase 1: collect unique product URLs ─────────────────────
  async collectProductUrls() {
    const urls = new Set();

    for (const categoryUrl of this.listPages) {
      this.log.info(`Crawling category: ${categoryUrl}`);
      let currentUrl = categoryUrl;
      let pageNum = 1;

      while (currentUrl && pageNum <= this.maxPages) {
        let $;
        try {
          $ = await this.load(currentUrl, `list #${pageNum} ${currentUrl}`);
        } catch (err) {
          this.log.error(`Failed crawling page ${pageNum} of ${categoryUrl}`, {
            error: err.message,
          });
          this.recordError(currentUrl, 'listing', err.message);
          break;
        }

        let links = [];
        try {
          links = await this.getProductLinks($, currentUrl);
        } catch (err) {
          this.recordError(currentUrl, 'listing', err.message);
        }

        // Stop paginating once a page yields no products.
        if (!links || links.length === 0) break;

        let added = 0;
        for (const link of links) {
          if (!link || urls.has(link)) continue;
          urls.add(link);
          added += 1;
        }
        this.log.info(`  Page ${pageNum}: +${added} products (total ${urls.size})`);

        currentUrl = await this.getNextPageUrl($, currentUrl);
        pageNum += 1;
        if (currentUrl) await this.delay(this.delayMs);
      }
    }

    return [...urls];
  }

  // ── Phase 2: parse each product (crash-safe) ─────────────────
  async parseProducts(productUrls) {
    let count = 0;
    for (const productUrl of productUrls) {
      count += 1;
      try {
        await this.delay(this.delayMs);
        const data = await withRetry(
          async () => {
            const $ = await this.load(productUrl, `detail ${productUrl}`);
            return this.parseProduct($, productUrl);
          },
          {
            retries: this.maxRetries,
            baseDelayMs: this.retryBaseDelayMs,
            label: `parseProduct ${productUrl}`,
            logger: this.log,
          }
        );

        if (!data) {
          this.skipped += 1;
          this.log.warn(`  [${count}/${productUrls.length}] skipped (no data)`, {
            productUrl,
          });
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

    try {
      const productUrls = await this.collectProductUrls();
      this.log.info(`Found ${productUrls.length} unique product URLs. Parsing...`);

      await this.parseProducts(productUrls);
    } finally {
      // Only set when the browser fallback was actually used.
      if (this._browser) {
        await this._browser.close();
        this._browser = null;
      }
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

module.exports = CheerioScraper;
