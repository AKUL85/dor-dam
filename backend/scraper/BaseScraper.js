// ─────────────────────────────────────────────────────────────
//  BaseScraper.js  —  shared framework for ALL store scrapers
//  Every store extends this class and only overrides selectors
// ─────────────────────────────────────────────────────────────
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class BaseScraper {
  constructor(config = {}) {
    this.storeName   = config.storeName   || 'Unknown Store';
    this.storeUrl    = config.storeUrl    || '';
    this.listPages   = config.listPages   || [];   // category/listing URLs
    this.delayMs     = config.delayMs     || 2000; // polite delay between requests
    this.maxPages    = config.maxPages    || 10;   // max pagination pages per category
    this.headless    = config.headless    !== false; // default headless=true

    this.results     = [];
    this.errors      = [];
    this.skipped     = 0;
  }

  // ── Helpers ─────────────────────────────────────────────────

  cleanPrice(raw) {
    if (!raw) return null;
    const cleaned = String(raw).replace(/[^\d]/g, '');
    return cleaned ? parseInt(cleaned, 10) : null;
  }

  cleanText(raw) {
    if (!raw) return null;
    return String(raw).trim().replace(/\s+/g, ' ');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  log(msg) {
    const time = new Date().toLocaleTimeString('en-BD', { hour12: false });
    console.log(`[${time}] [${this.storeName}] ${msg}`);
  }

  // ── Override these in each store scraper ────────────────────

  /**
   * Return all product page URLs from a listing/category page.
   * Override per store.
   */
  async getProductLinks(page, listingUrl) {
    throw new Error('getProductLinks() must be implemented in subclass');
  }

  /**
   * Navigate to a product URL and return a structured object.
   * Override per store.
   */
  async parseProduct(page, productUrl) {
    throw new Error('parseProduct() must be implemented in subclass');
  }

  /**
   * Handle pagination — return next page URL or null if last page.
   * Default: looks for a "next" link. Override if store uses different pattern.
   */
  async getNextPageUrl(page) {
    try {
      const next = await page.$eval(
        '.pagination .next a, a[rel="next"], .pagination li.active + li a',
        el => el.href
      ).catch(() => null);
      return next;
    } catch {
      return null;
    }
  }

  // ── Main runner ──────────────────────────────────────────────

  async run() {
    this.log(`Starting scrape of ${this.listPages.length} category page(s)...`);

    const browser = await chromium.launch({
      headless: this.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      userAgent: 'PhoneAdvisorBD-Bot/1.0 (+https://phoneadvisor.com.bd/bot)',
      viewport: { width: 1280, height: 800 },
      locale: 'en-BD',
    });

    // Block images/fonts to speed up scraping
    await context.route('**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,ttf,eot}', route => route.abort());

    const page = await context.newPage();

    // Step 1: Collect all product URLs across all category pages
    const allProductUrls = new Set();

    for (const categoryUrl of this.listPages) {
      this.log(`Crawling category: ${categoryUrl}`);
      let currentUrl = categoryUrl;
      let pageNum = 1;

      while (currentUrl && pageNum <= this.maxPages) {
        try {
          await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await this.delay(1000);

          const links = await this.getProductLinks(page, currentUrl);
          links.forEach(link => allProductUrls.add(link));
          this.log(`  Page ${pageNum}: found ${links.length} products (total: ${allProductUrls.size})`);

          currentUrl = await this.getNextPageUrl(page);
          pageNum++;

          if (currentUrl) await this.delay(this.delayMs);
        } catch (err) {
          this.log(`  ERROR on page ${pageNum}: ${err.message}`);
          this.errors.push({ url: currentUrl, error: err.message });
          break;
        }
      }
    }

    this.log(`Found ${allProductUrls.size} unique product URLs. Parsing each...`);

    // Step 2: Parse each product page
    let count = 0;
    for (const productUrl of allProductUrls) {
      count++;
      try {
        await this.delay(this.delayMs);
        const data = await this.parseProduct(page, productUrl);

        if (data) {
          data.scrapedAt = new Date().toISOString();
          data.store     = this.storeName;
          data.storeUrl  = this.storeUrl;
          this.results.push(data);
          this.log(`  [${count}/${allProductUrls.size}] ✓ ${data.name} — ৳${data.price}`);
        } else {
          this.skipped++;
          this.log(`  [${count}/${allProductUrls.size}] SKIP (no data): ${productUrl}`);
        }
      } catch (err) {
        this.skipped++;
        this.log(`  [${count}/${allProductUrls.size}] ERROR: ${productUrl} — ${err.message}`);
        this.errors.push({ url: productUrl, error: err.message });
      }
    }

    await browser.close();

    this.log(`Done! ${this.results.length} products scraped, ${this.skipped} skipped, ${this.errors.length} errors.`);
    return this.results;
  }

  // ── Save output ──────────────────────────────────────────────

  saveToJson(outputDir = './output') {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const timestamp   = new Date().toISOString().replace(/[:.]/g, '-');
    const storeName   = this.storeName.toLowerCase().replace(/\s+/g, '-');

    // Main results file
    const dataFile    = path.join(outputDir, `${storeName}-${timestamp}.json`);
    const summary     = {
      store:       this.storeName,
      scrapedAt:   new Date().toISOString(),
      totalFound:  this.results.length,
      totalErrors: this.errors.length,
      totalSkipped:this.skipped,
      products:    this.results,
    };
    fs.writeFileSync(dataFile, JSON.stringify(summary, null, 2), 'utf8');

    // Error log
    if (this.errors.length > 0) {
      const errorFile = path.join(outputDir, `${storeName}-errors-${timestamp}.json`);
      fs.writeFileSync(errorFile, JSON.stringify(this.errors, null, 2), 'utf8');
      this.log(`Error log saved: ${errorFile}`);
    }

    this.log(`Results saved: ${dataFile}`);
    return dataFile;
  }
}

module.exports = BaseScraper;