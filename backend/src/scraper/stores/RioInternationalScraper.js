// ─────────────────────────────────────────────────────────────
//  RioInternationalScraper — riointernational.com.bd
//
//  Rio International is a static, server-rendered storefront
//  (Laravel/Blade): every listing card, price, stock flag and the
//  full specification table is present in the initial HTML, so we
//  scrape it with axios + cheerio. Playwright remains available as
//  an automatic fallback (handled in CheerioScraper) should a page
//  ever fail to load via axios.
//
//  The store exposes one master mobile category (`/category/mobile`)
//  that aggregates every phone across all brands with `?page=N`
//  pagination, so a single listing entry point is enough. Per-brand
//  category pages are included as a safety net for brands that might
//  not surface in the master feed.
//
//  Implements only the store-specific selector/parse logic; all
//  resilience (rotating UA, retry, timeout, rate-limiting, logging),
//  the canonical product shape, de-duplication and result building
//  are inherited from CheerioScraper / AbstractScraper, and parsing
//  helpers come from the shared parsers util.
// ─────────────────────────────────────────────────────────────
const CheerioScraper = require('../core/CheerioScraper');
const { cleanPrice, cleanText, stripHtml, extractKeySpecs } = require('../../utils/parsers');

const STORE_URL = 'https://riointernational.com.bd';

// Master phone feed first (covers every brand), then per-brand
// category pages as a safety net.
const LIST_PAGES = [
  `${STORE_URL}/category/mobile`,
  `${STORE_URL}/category/iphone`,
  `${STORE_URL}/category/samsung-mobile`,
  `${STORE_URL}/category/Xiaomi`,
  `${STORE_URL}/category/realme`,
  `${STORE_URL}/category/oppo`,
  `${STORE_URL}/category/vivo`,
  `${STORE_URL}/category/oneplus`,
  `${STORE_URL}/category/google`,
  `${STORE_URL}/category/honor`,
  `${STORE_URL}/category/motorola`,
  `${STORE_URL}/category/nokia`,
  `${STORE_URL}/category/nothing`,
  `${STORE_URL}/category/infinix`,
  `${STORE_URL}/category/tecno`,
  `${STORE_URL}/category/iqoo`,
];

// Ordered brand keyword → canonical brand. The first match against
// the product name wins, so more specific keywords come first.
const BRAND_KEYWORDS = [
  [/\biphone\b/i, 'Apple'],
  [/\bsamsung\b|\bgalaxy\b/i, 'Samsung'],
  [/\bredmi\b|\bpoco\b|\bxiaomi\b/i, 'Xiaomi'],
  [/\brealme\b/i, 'Realme'],
  [/\boneplus\b/i, 'OnePlus'],
  [/\biqoo\b/i, 'iQOO'],
  [/\bvivo\b/i, 'Vivo'],
  [/\boppo\b/i, 'Oppo'],
  [/\bpixel\b|\bgoogle\b/i, 'Google'],
  [/\bhonor\b/i, 'Honor'],
  [/\bhuawei\b/i, 'Huawei'],
  [/\bmotorola\b|\bmoto\b/i, 'Motorola'],
  [/\bnokia\b/i, 'Nokia'],
  [/\bnothing\b/i, 'Nothing'],
  [/\binfinix\b/i, 'Infinix'],
  [/\btecno\b/i, 'Tecno'],
  [/\bitel\b/i, 'Itel'],
  [/\bsymphony\b/i, 'Symphony'],
  [/\bwalton\b/i, 'Walton'],
  [/\basus\b|\brog\s*phone\b/i, 'Asus'],
  [/\bzte\b|\bnubia\b/i, 'ZTE'],
];

// Product-name patterns that mean "this is *not* a phone" — a safety
// net so accessories that slip into a feed are never emitted.
const NON_PHONE_NAME_PATTERNS = [
  /\b(tablet|ipad)\b/i,
  /\b(earbud|earphone|headphone|headset|neckband|airpods?)\b/i,
  /\b(watch|smartwatch|smart watch)\b/i,
  /\b(smart band|fitness band)\b/i,
  /\b(charger|adapter|power\s*bank|powerbank|cable|cord)\b/i,
  /\b(cover|case|glass|protector|stand|holder|cooler)\b/i,
  /\b(speaker|soundbar|sound bar)\b/i,
  /\b(mouse|keyboard|laptop|notebook|macbook|monitor)\b/i,
  /\b(router|hub|dock|tv\s*box|smart tv)\b/i,
];

// Generic keys we never want in the cleaned `specs` map.
const JUNK_SPEC_KEYS = new Set([
  '',
  'category',
  'specification',
  'specifications',
  'value',
  'feature',
  'features',
  'details',
  'description',
  'full specifications',
]);

class RioInternationalScraper extends CheerioScraper {
  static storeKey = 'rio-international';

  constructor(overrides = {}) {
    super({
      storeName: 'Rio International',
      storeUrl: STORE_URL,
      listPages: overrides.listPages || LIST_PAGES,
      ...overrides,
    });
  }

  // ── Brand inference (from the product name) ──────────────────
  inferBrand(name) {
    const text = String(name || '');
    for (const [pattern, brand] of BRAND_KEYWORDS) {
      if (pattern.test(text)) return brand;
    }
    // Fallback: first word, title-cased (e.g. "Lava Blaze" -> "Lava").
    const first = text.trim().split(/\s+/)[0];
    return first ? first.charAt(0).toUpperCase() + first.slice(1) : null;
  }

  isPhone(name) {
    for (const pattern of NON_PHONE_NAME_PATTERNS) {
      if (pattern.test(name)) return false;
    }
    return true;
  }

  // ── Listing-page extraction ─────────────────────────────────
  async getProductLinks($, listingUrl) {
    const links = [];
    $('.product-item a[href*="/product/"], .product-name a[href*="/product/"]').each(
      (_i, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        try {
          const abs = new URL(href, listingUrl).toString().split('#')[0];
          if (abs.includes('/product/')) links.push(abs);
        } catch {
          /* skip malformed href */
        }
      }
    );
    return [...new Set(links)];
  }

  // Rio renders a standard Bootstrap pager with `rel="next"`.
  async getNextPageUrl($, currentUrl) {
    const href = $('a.page-link[rel="next"], a[rel="next"]').attr('href');
    if (!href) return null;
    try {
      const next = new URL(href, currentUrl);
      if (next.origin !== new URL(currentUrl).origin) return null;
      return next.toString();
    } catch {
      return null;
    }
  }

  // ── Product-page parsing ────────────────────────────────────
  async parseProduct($, productUrl) {
    const meta = (prop) =>
      $(`meta[property="${prop}"]`).attr('content') ||
      $(`meta[name="${prop}"]`).attr('content') ||
      null;

    const name =
      cleanText($('h1.product-title').first().text()) ||
      cleanText($('h1').first().text()) ||
      cleanText(meta('og:title'));
    if (!name) return null;

    // Phone-only safety net.
    if (!this.isPhone(name)) {
      this.skipped += 1;
      this.log.debug('Skipping non-phone product', { productUrl, name });
      return null;
    }

    // ── Pricing ───────────────────────────────────────────────
    // The detail page carries two hidden inputs:
    //   #product_price          → regular/MRP
    //   #product_discount_price → discounted price (0 when none)
    const regular = cleanPrice($('#product_price').attr('value'));
    const discounted = cleanPrice($('#product_discount_price').attr('value'));
    const metaPrice = cleanPrice(meta('product:price:amount'));

    let price;
    let originalPrice = null;
    if (discounted && regular && discounted > 0 && discounted < regular) {
      price = discounted;
      originalPrice = regular;
    } else {
      price = regular || discounted || metaPrice || null;
    }

    let discountAmount = null;
    let discountPct = null;
    if (originalPrice && price && originalPrice > price) {
      discountAmount = originalPrice - price;
      discountPct = Math.round((discountAmount / originalPrice) * 100);
    }

    // ── Availability ──────────────────────────────────────────
    const availability = (meta('product:availability') || '').toLowerCase();
    let inStock = availability.includes('in stock');
    if (!availability) {
      // Fallback: an "Out of Stock" badge/label in the markup.
      const bodyText = $('.product-stock, .stock, .availability').text().toLowerCase();
      inStock = bodyText.includes('out of stock') ? false : true;
    }

    // ── Basic fields ──────────────────────────────────────────
    const brand = this.inferBrand(name);
    const category = this.deriveCategory($, meta) || 'Mobile Phone';
    const imageUrl = meta('og:image') || this.firstProductImage($) || null;
    const shortDescription = stripHtml(meta('og:description'));

    // ── Specifications ────────────────────────────────────────
    const specs = this.parseSpecifications($);
    const descriptionText = this.parseDescription($) || shortDescription || '';
    const keySpecs = extractKeySpecs(specs, name, descriptionText);

    return {
      name,
      brand,
      category,
      productUrl,
      imageUrl,
      price,
      originalPrice,
      discountAmount,
      discountPct,
      inStock,
      stockStatus: inStock ? 'In Stock' : 'Out of Stock',
      shortDescription: shortDescription ? shortDescription.slice(0, 500) : null,
      specs,
      keySpecs,
    };
  }

  /** Prefer the breadcrumb leaf; fall back to og:type's category part. */
  deriveCategory($, meta) {
    const crumbs = $('.breadcrumb li, .breadcrumb-nav a')
      .map((_i, el) => cleanText($(el).text()))
      .get()
      .filter(Boolean);
    // og:type looks like "Mobile, Samsung" — take the leading label.
    const ogType = (meta('og:type') || '').split(',')[0];
    if (ogType && /mobile|phone/i.test(ogType)) return cleanText(ogType);
    const leaf = crumbs.length ? crumbs[crumbs.length - 1] : null;
    if (leaf && !/home/i.test(leaf)) return leaf;
    return null;
  }

  firstProductImage($) {
    const img = $('.product-media img, .pd-gallery img, .product-image img').first();
    return img.attr('data-src') || img.attr('src') || null;
  }

  parseDescription($) {
    const text = $('.section.pd-menu-1, .product-description, #pd-menu-1')
      .first()
      .text();
    return cleanText(text);
  }

  /**
   * Flatten the two-column specification table into a { key: value }
   * map. The table uses <tr><td>key</td><td>value</td></tr> rows with
   * a few header rows (title + "Category | Specification") we skip.
   */
  parseSpecifications($) {
    const specs = {};
    const seen = new Set();

    $('.section.pd-menu-2 table tr, .product-tabs-content table tr').each((_i, row) => {
      const cells = $(row).find('td');
      if (cells.length < 2) return; // title row / divider
      const key = cleanText($(cells[0]).text().replace(/:$/, ''));
      const val = cleanText($(cells[1]).text());
      if (!key || !val) return;
      if (JUNK_SPEC_KEYS.has(key.toLowerCase())) return;
      if (key.length > 80) return;
      const dedup = `${key}||${val}`;
      if (seen.has(dedup)) return;
      seen.add(dedup);
      if (specs[key] === undefined) specs[key] = val;
    });

    return specs;
  }
}

module.exports = RioInternationalScraper;
