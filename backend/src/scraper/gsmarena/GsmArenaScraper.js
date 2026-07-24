// ─────────────────────────────────────────────────────────────
//  GsmArenaScraper — builds a GSMArena-style phone catalog.
//
//  Flow:
//    1. brands   ← makers.php3
//    2. models   ← <brand>-phones-<id>.php  (paginated, phones only)
//    3. devices  ← <model>-<id>.php          (full spec tables)
//
//  Resilience & politeness:
//    • rotating user-agents, retries w/ backoff, per-request timeout
//    • polite inter-request delay
//    • on-disk HTML cache so re-parsing never re-hits the network
//    • crash-safe: a single failing page never aborts the whole run
//
//  Output: a single catalog object { brands, phones } persisted as
//  JSON (see saveCatalog); the API serves directly from this file
//  when no database is configured.
// ─────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cheerio = require('cheerio');
const { chromium } = require('playwright');

const config = require('../../config/env');
const logger = require('../../utils/logger');
const { delay } = require('../../utils/delay');
const { withRetry } = require('../../utils/retry');
const parse = require('./parse');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
];

const MAKERS_URL = `${parse.GSM_BASE}makers.php3`;

class GsmArenaScraper {
  constructor(options = {}) {
    this.log = logger.child({ scope: 'GSMArena' });

    // Politeness / resilience knobs (default to a gentle profile —
    // GSMArena rate-limits aggressively).
    this.delayMs = options.delayMs ?? 1500;
    this.maxRetries = options.maxRetries ?? config.scraper.maxRetries;
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? 1500;
    this.navigationTimeoutMs =
      options.navigationTimeoutMs ?? config.scraper.navigationTimeoutMs;

    // Scope controls.
    this.brandsFilter = options.brands || null; // e.g. ['apple','samsung']
    this.maxBrands = options.maxBrands ?? null;
    this.maxPagesPerBrand = options.maxPagesPerBrand ?? 100;
    this.maxModelsPerBrand = options.maxModelsPerBrand ?? null;
    this.phonesOnly = options.phonesOnly ?? true;

    // Caching.
    this.useCache = options.useCache ?? true;
    this.cacheDir =
      options.cacheDir || path.join(process.cwd(), '.cache', 'gsmarena');
    this.cacheTtlMs = options.cacheTtlMs ?? 1000 * 60 * 60 * 24 * 7; // 7 days

    this.outputDir = options.outputDir || config.scraper.outputDir;

    this._uaIndex = 0;
    this.errors = [];
  }

  pickUserAgent() {
    const ua = USER_AGENTS[this._uaIndex % USER_AGENTS.length];
    this._uaIndex += 1;
    return ua;
  }

  // ── Caching ──────────────────────────────────────────────────
  _cachePath(url) {
    const hash = crypto.createHash('sha1').update(url).digest('hex');
    return path.join(this.cacheDir, `${hash}.html`);
  }

  _readCache(url) {
    if (!this.useCache) return null;
    const file = this._cachePath(url);
    try {
      const stat = fs.statSync(file);
      if (Date.now() - stat.mtimeMs > this.cacheTtlMs) return null;
      return fs.readFileSync(file, 'utf8');
    } catch {
      return null;
    }
  }

  _writeCache(url, html) {
    if (!this.useCache) return;
    try {
      if (!fs.existsSync(this.cacheDir)) fs.mkdirSync(this.cacheDir, { recursive: true });
      fs.writeFileSync(this._cachePath(url), html, 'utf8');
    } catch (err) {
      this.log.debug('Cache write failed', { url, error: err.message });
    }
  }

  async setupBrowser() {
    if (this.browser) return;
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext({
      userAgent: this.pickUserAgent(),
      viewport: { width: 1280, height: 720 },
    });
    this.page = await this.context.newPage();
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.context = null;
    }
  }

  // ── Fetching ─────────────────────────────────────────────────
  async fetch(url, label) {
    const cached = this._readCache(url);
    if (cached) {
      this.log.debug('cache hit', { url });
      return cached;
    }

    await delay(this.delayMs);
    const html = await withRetry(
      async () => {
        await this.setupBrowser();
        const res = await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.navigationTimeoutMs });
        if (res && res.status() >= 400 && res.status() !== 404) {
          throw new Error(`Request failed with status code ${res.status()}`);
        }
        // Give it a tiny bit of time for JS to render if needed, though GSMArena is mostly SSR
        await delay(500);
        return await this.page.content();
      },
      {
        retries: this.maxRetries,
        baseDelayMs: this.retryBaseDelayMs,
        label: label || `GET ${url}`,
        logger: this.log,
        shouldRetry: (err) => {
          return true; // With playwright, retry on any failure
        },
      }
    );

    this._writeCache(url, html);
    return html;
  }

  async load(url, label) {
    return cheerio.load(await this.fetch(url, label));
  }

  recordError(url, stage, error) {
    this.errors.push({ url, stage, error });
    this.log.error(`${stage} failed`, { url, error });
  }

  // ── Step 1: brands ───────────────────────────────────────────
  async getBrands() {
    this.log.info('Fetching brand index');
    const $ = await this.load(MAKERS_URL, 'makers');
    let brands = parse.parseBrands($);

    if (this.brandsFilter && this.brandsFilter.length) {
      const wanted = this.brandsFilter.map((b) => b.toLowerCase());
      brands = brands.filter((b) =>
        wanted.some(
          (w) => b.slug.toLowerCase().startsWith(w) || b.name.toLowerCase() === w
        )
      );
    }
    if (this.maxBrands) brands = brands.slice(0, this.maxBrands);

    this.log.info(`Brands to crawl: ${brands.length}`);
    return brands;
  }

  // ── Step 2: models for a brand (paginated) ───────────────────
  async getModelsForBrand(brand) {
    const models = [];
    const seen = new Set();
    let url = brand.listUrl;
    let page = 1;

    while (url && page <= this.maxPagesPerBrand) {
      let $;
      try {
        $ = await this.load(url, `${brand.slug} list p${page}`);
      } catch (err) {
        this.recordError(url, 'brand-list', err.message);
        break;
      }

      const pageModels = parse.parseModelList($, { phonesOnly: this.phonesOnly });
      for (const m of pageModels) {
        if (!m.detailUrl || seen.has(m.detailUrl)) continue;
        seen.add(m.detailUrl);
        models.push({ ...m, brand: brand.name, brandSlug: brand.slug });
      }

      this.log.info(`  ${brand.name} page ${page}: +${pageModels.length} (total ${models.length})`);

      if (this.maxModelsPerBrand && models.length >= this.maxModelsPerBrand) {
        return models.slice(0, this.maxModelsPerBrand);
      }

      url = parse.parseNextPageUrl($);
      page += 1;
    }

    return models;
  }

  // ── Step 3: device detail ────────────────────────────────────
  async getDevice(model) {
    const $ = await this.load(model.detailUrl, `device ${model.slug}`);
    const device = parse.parseDevice($, {
      brand: model.brand,
      slug: model.slug,
      deviceId: model.deviceId,
      detailUrl: model.detailUrl,
    });
    if (!device) return null;
    // Prefer the crisp list thumbnail when the hero image is missing.
    if (!device.imageUrl && model.thumb) device.imageUrl = model.thumb;
    device.thumb = model.thumb || device.imageUrl;
    
    device.pictures = [];
    if (device.picturesUrl) {
      try {
        const $pics = await this.load(device.picturesUrl, `pictures ${model.slug}`);
        device.pictures = parse.parsePicturesPage($pics);
      } catch (err) {
        this.log.warn(`Failed to fetch pictures for ${model.slug}`, { error: err.message, url: device.picturesUrl });
      }
    }
    
    if (device.pictures.length === 0 && device.imageUrl) {
      device.pictures = [device.imageUrl];
    }
    
    return device;
  }

  // ── Main runner ──────────────────────────────────────────────
  async run() {
    const startedAt = Date.now();
    const brands = await this.getBrands();

    const brandSummaries = [];
    const phones = [];
    let processed = 0;

    for (const brand of brands) {
      let models = [];
      try {
        models = await this.getModelsForBrand(brand);
      } catch (err) {
        this.recordError(brand.listUrl, 'brand', err.message);
      }

      brandSummaries.push({
        name: brand.name,
        slug: brand.slug,
        brandId: brand.brandId,
        listUrl: brand.listUrl,
        deviceCount: brand.deviceCount,
        phoneCount: models.length,
      });

      for (const model of models) {
        processed += 1;
        try {
          const device = await this.getDevice(model);
          if (device) {
            phones.push(device);
            this.log.info(`  [${processed}] ✓ ${device.brand} ${device.modelName}`);
          } else {
            this.log.warn(`  [${processed}] skipped (no data)`, { url: model.detailUrl });
          }
        } catch (err) {
          this.recordError(model.detailUrl, 'device', err.message);
        }
      }
    }

    const durationMs = Date.now() - startedAt;
    const catalog = {
      source: 'gsmarena.com',
      generatedAt: new Date().toISOString(),
      durationMs,
      totalBrands: brandSummaries.length,
      totalPhones: phones.length,
      totalErrors: this.errors.length,
      brands: brandSummaries,
      phones,
      errors: this.errors,
    };

    this.log.info('GSMArena scrape complete', {
      brands: brandSummaries.length,
      phones: phones.length,
      errors: this.errors.length,
      durationMs,
    });

    await this.closeBrowser();

    return catalog;
  }

  // ── Persistence ──────────────────────────────────────────────
  saveCatalog(catalog, { latest = true } = {}) {
    if (!fs.existsSync(this.outputDir)) fs.mkdirSync(this.outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const stamped = path.join(this.outputDir, `gsmarena-catalog-${timestamp}.json`);
    fs.writeFileSync(stamped, JSON.stringify(catalog, null, 2), 'utf8');

    // A stable "latest" pointer the API reads by default.
    if (latest) {
      const latestFile = path.join(this.outputDir, 'gsmarena-catalog-latest.json');
      fs.writeFileSync(latestFile, JSON.stringify(catalog, null, 2), 'utf8');
    }

    this.log.info(`Catalog saved: ${stamped}`);
    return stamped;
  }
}

module.exports = GsmArenaScraper;
