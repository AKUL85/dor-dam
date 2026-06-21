// ─────────────────────────────────────────────────────────────
//  MobileDokanScraper — mobiledokan.com
//
//  MobileDokan is a server-rendered (Livewire) catalogue, so the
//  product grid and spec tables are present in the initial HTML.
//  We drive it with Playwright (like StarTech) so we inherit the
//  shared resilience stack (retry, timeout, rate-limit, logging)
//  and the canonical product shape from BaseScraper/AbstractScraper.
//
//  Strategy: crawl per-brand listing pages (?type=mobile) which are
//  cleanly paginated (100 phones/page, &page=N). Out-of-range pages
//  return zero products, so pagination terminates naturally.
// ─────────────────────────────────────────────────────────────
const BaseScraper = require('../core/BaseScraper');
const { cleanPrice, cleanText, extractKeySpecs } = require('../../utils/parsers');

const STORE_URL = 'https://www.mobiledokan.com';

// Every mobile brand listed on /mobile-brands. Crawling per brand with
// ?type=mobile guarantees we collect ONLY mobile phone products.
const BRANDS = [
  '5star', 'acer', 'alcatel', 'allview', 'apple', 'asus', 'benco', 'bengal',
  'blackberry', 'blackview', 'blu', 'cat', 'celkon', 'coolpad', 'cubot',
  'doogee', 'energizer', 'fairphone', 'freeyond', 'gdl', 'geo', 'gionee',
  'google', 'hallo', 'helio', 'hmd', 'honor', 'htc', 'huawei', 'ikko',
  'infinix', 'iqoo', 'itel', 'kingstar', 'kyocera', 'lava', 'leica', 'leitz',
  'lenovo', 'lg', 'nokia', 'oneplus', 'oppo', 'realme', 'samsung', 'symphony',
  'tecno', 'vivo', 'walton', 'xiaomi',
];

// Spec-table keys/values that are noise rather than real specifications.
const JUNK_SPEC_KEYS = new Set(['', 'specification', 'value', 'details']);

// Known brands for name-based detection fallback (longest match wins).
const BRAND_KEYWORDS = [
  'Samsung', 'Apple', 'iPhone', 'Xiaomi', 'Redmi', 'Poco', 'Realme', 'Oppo',
  'Vivo', 'iQOO', 'OnePlus', 'Infinix', 'Tecno', 'Itel', 'Nokia', 'Motorola',
  'Honor', 'Huawei', 'Google', 'Asus', 'Lenovo', 'Symphony', 'Walton', 'Lava',
  'Nothing', 'Sony', 'LG', 'HMD',
];

class MobileDokanScraper extends BaseScraper {
  static storeKey = 'mobile-dokan';

  constructor(overrides = {}) {
    super({
      storeName: 'MobileDokan',
      storeUrl: STORE_URL,
      listPages: (overrides.brands || BRANDS).map(
        (brand) => `${STORE_URL}/mobile-brand/${brand}?type=mobile`
      ),
      ...overrides,
    });
  }

  // Read all <meta property|name> tags into a plain object.
  async getMeta(page) {
    return page.$$eval('meta[property], meta[name]', (metas) =>
      metas.reduce((acc, m) => {
        const key = m.getAttribute('property') || m.getAttribute('name');
        const val = m.getAttribute('content');
        if (key && val) acc[key] = val;
        return acc;
      }, {})
    );
  }

  // ── Phase 1: collect product URLs from a listing page ────────
  async getProductLinks(page) {
    try {
      await page.waitForSelector('.product-card a[href*="/mobile/"]', { timeout: 15000 });
      const links = await page.$$eval('.product-card a[href*="/mobile/"]', (els) =>
        els
          .map((a) => a.href)
          // Product detail pages are /mobile/<slug>; exclude /mobile-brand,
          // /mobile-phones, /mobile-comparisons, etc. (all use /mobile-).
          .filter((h) => h && h.includes('/mobile/') && !h.includes('#'))
      );
      return [...new Set(links)];
    } catch {
      // No products on this page (e.g. out-of-range pagination) — stop here.
      return [];
    }
  }

  // Pagination is ?type=mobile&page=N. Incrementing past the last page
  // yields an empty grid, which BaseScraper treats as "stop paginating".
  async getNextPageUrl(page) {
    try {
      const url = new URL(page.url());
      const current = parseInt(url.searchParams.get('page') || '1', 10);
      url.searchParams.set('page', String(current + 1));
      return url.toString();
    } catch {
      return null;
    }
  }

  // ── Phase 2: parse a single product detail page ──────────────
  async parseProduct(page, productUrl) {
    await this.goto(page, productUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1', { timeout: 15000 });

    const meta = await this.getMeta(page);

    const name =
      (await page.$eval('h1[itemprop="name"], h1', (el) => el.textContent.trim()).catch(() => null)) ||
      meta['og:title'];
    if (!name) return null;

    const offer = await this.parseOffer(page);
    const specs = await this.parseSpecifications(page);

    const brand =
      cleanText(specs.Brand) || this.detectBrand(name) || null;
    const imageUrl = meta['og:image'] || null;
    const shortDescription = meta.description || meta['og:description'] || null;

    // availability meta is schema.org-style: InStock / OutOfStock / PreOrder
    // / Upcoming. priceType ("Expected") also signals an unreleased phone.
    const availability = (offer.availability || '').toLowerCase();
    let inStock = /instock|in stock|available/.test(availability);
    if (offer.priceType && /expected|upcoming|pre.?order/i.test(offer.priceType)) {
      inStock = false;
    }
    const stockStatus = this.deriveStockStatus(offer, inStock);

    return {
      name: cleanText(name),
      brand,
      category: cleanText(specs['Device Type']) || 'Mobile Phone',
      productUrl,
      imageUrl,
      price: offer.price,
      originalPrice: offer.originalPrice,
      inStock,
      stockStatus,
      shortDescription: shortDescription ? shortDescription.slice(0, 500) : null,
      specs,
      keySpecs: extractKeySpecs(specs, name, shortDescription || ''),
    };
  }

  /** Extract price, price type, original price and availability. */
  async parseOffer(page) {
    const raw = await page.evaluate(() => {
      const scope = document.querySelector('[itemprop="offers"]') || document;
      const priceMeta = scope.querySelector('meta[itemprop="price"]');
      const priceEl = scope.querySelector('.text-primary.fw-bold, [itemprop="price"]');
      const typeEl = scope.querySelector('.text-danger, .text-success, .pricetype');
      const oldEl = scope.querySelector(
        'del, s, .text-decoration-line-through, .old-price'
      );
      const availEl = scope.querySelector('meta[itemprop="availability"]');
      return {
        price: priceMeta ? priceMeta.getAttribute('content') : priceEl ? priceEl.textContent : null,
        priceType: typeEl ? typeEl.textContent.trim() : null,
        originalPrice: oldEl ? oldEl.textContent : null,
        availability: availEl ? availEl.getAttribute('content') : null,
      };
    });

    const price = cleanPrice(raw.price);
    let originalPrice = cleanPrice(raw.originalPrice);
    if (originalPrice !== null && price !== null && originalPrice <= price) {
      originalPrice = null;
    }

    return {
      price,
      originalPrice,
      priceType: raw.priceType ? raw.priceType.replace(/[()]/g, '').trim() : null,
      availability: raw.availability,
    };
  }

  /** Turn the spec tables (td.td1 key / td value) into a flat object. */
  async parseSpecifications(page) {
    const rows = await page.$$eval('tr', (trs) =>
      trs
        .map((tr) => {
          const tds = tr.querySelectorAll('td');
          if (tds.length < 2) return null;
          return {
            key: tds[0].textContent.trim().replace(/:$/, ''),
            val: tds[1].textContent.trim().replace(/\s+/g, ' '),
            isSpec: (tds[0].className || '').includes('td1'),
          };
        })
        .filter(Boolean)
    );

    // Prefer the dedicated spec rows (td1); fall back to any 2-col row.
    const specRows = rows.some((r) => r.isSpec) ? rows.filter((r) => r.isSpec) : rows;

    const specs = {};
    for (const { key, val } of specRows) {
      if (!key || !val || key.length > 60) continue;
      if (JUNK_SPEC_KEYS.has(key.toLowerCase())) continue;
      if (val === 'true' || val === 'false') continue;
      if (!(key in specs)) specs[key] = val;
    }
    return specs;
  }

  deriveStockStatus(offer, inStock) {
    if (offer.priceType && /expected|upcoming/i.test(offer.priceType)) return 'Upcoming';
    if (offer.availability) {
      // Split CamelCase schema values (e.g. "OutOfStock" -> "Out Of Stock").
      const text = offer.availability.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
      return cleanText(text);
    }
    return inStock ? 'In Stock' : 'Out of Stock';
  }

  /** Best-effort brand detection from the product name. */
  detectBrand(name) {
    const lower = String(name || '').toLowerCase();
    for (const brand of BRAND_KEYWORDS) {
      if (lower.includes(brand.toLowerCase())) {
        // Normalise the two Apple aliases.
        if (brand === 'iPhone') return 'Apple';
        if (brand === 'Redmi' || brand === 'Poco') return 'Xiaomi';
        return brand;
      }
    }
    return null;
  }
}

module.exports = MobileDokanScraper;
