// ─────────────────────────────────────────────────────────────
//  CustomMacBdScraper — custommacbd.com
//
//  Custom Mac BD runs on Shopify, which exposes a public JSON feed
//  for every collection (`/collections/<handle>/products.json`).
//  That feed already carries everything we need for a product —
//  title, vendor (brand), product_type, the full `body_html`
//  (which contains the spec table), every variant's price /
//  compare_at_price / availability, and images — so we scrape the
//  API directly instead of driving a browser. It is faster, lighter
//  and far more reliable than rendering HTML with Playwright.
//
//  Only phones are scraped, by crawling the two phone collections:
//    • apple-iphone-price-in-bangladesh  (iPhones)
//    • android-phones                    (Samsung/Google/Honor/…)
//  A name-pattern safety net drops any stray accessory.
//
//  Only the store-specific endpoints + field mapping live here;
//  pagination, retries, timeouts, polite delays, de-duplication and
//  the canonical product shape come from ApiScraper / AbstractScraper.
// ─────────────────────────────────────────────────────────────
const ApiScraper = require('../core/ApiScraper');
const {
  cleanText,
  stripHtml,
  extractKeySpecs,
} = require('../../utils/parsers');

const STORE_URL = 'https://www.custommacbd.com';
// Shopify caps the products.json feed at 250 items per page.
const PER_PAGE = 250;

// Shopify collection handles that contain *only* phones. Crawling
// these (instead of the whole catalogue) keeps the run phone-only
// without having to inspect every product.
const PHONE_COLLECTIONS = [
  'apple-iphone-price-in-bangladesh',
  'android-phones',
];

// Brand keywords recognised in a product title as a fallback when
// the Shopify `vendor` field is missing or generic.
const NAME_BRAND_KEYWORDS = [
  'iPhone',
  'Galaxy',
  'Redmi',
  'Xiaomi',
  'Poco',
  'OnePlus',
  'Pixel',
  'Huawei',
  'Honor',
  'Vivo',
  'Realme',
  'Oppo',
  'Nokia',
  'Infinix',
  'Tecno',
  'Motorola',
  'Nothing',
  'Asus',
  'Sony',
];

// Vendors that are never phone makers — if Shopify reports one of
// these as the vendor we fall back to name-based brand detection.
const NON_PHONE_VENDORS = new Set([
  'apple',          // Apple vendor spans Macs/iPads too; the iPhone
                    // collection guarantees phones, so keep "Apple".
]);

// Product-title patterns that mean "this is *not* a phone" — a
// safety net in case an accessory slips into a phone collection.
const NON_PHONE_NAME_PATTERNS = [
  /\b(tablet|ipad)\b/i,
  /\b(macbook|laptop|notebook|imac|mac\s*mini|mac\s*studio)\b/i,
  /\b(earbud|earphone|headphone|headset|neckband|airpods?|buds)\b/i,
  /\b(watch|smartwatch|smart watch)\b/i,
  /\b(smart band|fitness band)\b/i,
  /\b(charger|adapter|power\s*bank|powerbank|cable|cord)\b/i,
  /\b(cover|case|glass|protector|stand|holder|cooler|skin)\b/i,
  /\b(speaker|soundbar)\b/i,
  /\b(mouse|keyboard|monitor)\b/i,
  /\b(camera|lens|tripod|gimbal)\b/i,
  /\b(memory card|sd card|pendrive|usb drive)\b/i,
];

// Generic keys we never want in the cleaned `specs` map.
const JUNK_SPEC_KEYS = new Set([
  '',
  'value',
  'feature',
  'features',
  'specification',
  'specifications',
  'technical details',
  'details',
  'view more info',
  'see more',
  'read more',
  'key features',
  'general',
  'description',
  'descriptions',
  'reviews',
  'additional information',
]);

class CustomMacBdScraper extends ApiScraper {
  static storeKey = 'custom-mac-bd';

  constructor(overrides = {}) {
    super({
      storeName: 'Custom Mac BD',
      storeUrl: STORE_URL,
      // Catalogue feeds to crawl. Phones by default; extend as needed.
      categories: overrides.categories || PHONE_COLLECTIONS,
      ...overrides,
    });
  }

  // ── Brand inference ──────────────────────────────────────────
  // Prefer Shopify's `vendor`, then fall back to scanning the title.
  inferBrand(vendor, name) {
    const v = cleanText(vendor);
    if (v && !NON_PHONE_VENDORS.has(v.toLowerCase())) return v;

    const lower = String(name || '').toLowerCase();
    for (const kw of NAME_BRAND_KEYWORDS) {
      if (lower.includes(kw.toLowerCase())) {
        // iPhone → Apple, everything else maps to the keyword itself.
        return /iphone/i.test(kw) ? 'Apple' : kw;
      }
    }
    return v || null;
  }

  // ── Phase 1: one JSON page of a collection ───────────────────
  async fetchPage(category, pageNum) {
    const url = `${this.storeUrl}/collections/${encodeURIComponent(
      category
    )}/products.json?limit=${PER_PAGE}&page=${pageNum}`;
    const body = await this.getJson(url, `list ${category} #${pageNum}`);
    const items = Array.isArray(body.products) ? body.products : [];
    // A full page implies there may be another; a short page is the last.
    return { items, hasNextPage: items.length >= PER_PAGE };
  }

  getItemKey(item) {
    return item.handle || String(item.id);
  }

  // ── Phase 2: map one Shopify product to the canonical shape ──
  async buildProduct(item) {
    const name = cleanText(item.title);
    if (!name) return null;

    // Phone-only safety net — drop anything that is clearly an
    // accessory even though it lives in a phone collection.
    for (const pattern of NON_PHONE_NAME_PATTERNS) {
      if (pattern.test(name)) {
        this.log.debug('Skipping non-phone product', {
          handle: item.handle,
          reason: 'name-pattern',
          name,
        });
        return null;
      }
    }

    const brand = this.inferBrand(item.vendor, name);
    const category = cleanText(item.product_type) || 'Mobile Phone';

    // ── Price across variants ─────────────────────────────────
    // A Shopify product has one variant per colour/storage combo.
    // We surface the lowest sell price as the canonical `price`,
    // and the highest `compare_at_price` (if any) as `originalPrice`
    // so the shared normaliser can derive the discount.
    // Shopify reports prices as decimal strings ("115000.00"), so parse
    // them numerically — stripping non-digits would drop the decimal
    // point and inflate the value 100×.
    const variants = Array.isArray(item.variants) ? item.variants : [];
    const prices = variants
      .map((v) => this._num(v.price))
      .filter((n) => n !== null && n > 0);
    const compares = variants
      .map((v) => this._num(v.compare_at_price))
      .filter((n) => n !== null && n > 0);

    const price = prices.length ? Math.min(...prices) : null;
    const compareMax = compares.length ? Math.max(...compares) : null;
    const originalPrice = compareMax && price && compareMax > price ? compareMax : null;

    // ── Availability ──────────────────────────────────────────
    // In stock when any variant is purchasable.
    const inStock = variants.some((v) => v.available === true);

    // ── Specs + description from body_html ────────────────────
    const specs = this.parseSpecifications(item.body_html);
    const descriptionText = this.parseDescription(item.body_html);

    // ── Image ─────────────────────────────────────────────────
    const imageUrl =
      (Array.isArray(item.images) && item.images[0] && item.images[0].src) ||
      (item.image && item.image.src) ||
      null;

    return {
      name,
      brand,
      category,
      productUrl: `${this.storeUrl}/products/${item.handle}`,
      imageUrl,
      price,
      originalPrice,
      inStock,
      stockStatus: inStock ? 'In Stock' : 'Out of Stock',
      shortDescription: descriptionText ? descriptionText.slice(0, 500) : null,
      specs,
      keySpecs: extractKeySpecs(specs, name, descriptionText),
    };
  }

  // ── Spec-table extraction ────────────────────────────────────
  // The Shopify `body_html` opens with a "Technical Details" table of
  // <tr><td>key</td><td>value</td></tr> rows. We parse the first table
  // with light-weight regex (no DOM/cheerio dependency) and clean each
  // cell with the shared stripHtml helper.
  parseSpecifications(bodyHtml) {
    const specs = {};
    if (!bodyHtml) return specs;

    const tableMatch = String(bodyHtml).match(/<table[\s\S]*?<\/table>/i);
    if (!tableMatch) return specs;

    const rows = tableMatch[0].match(/<tr[\s\S]*?<\/tr>/gi) || [];
    const seen = new Set();
    for (const row of rows) {
      const cells = row.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || [];
      if (cells.length < 2) continue;

      const key = stripHtml(cells[0]);
      const val = stripHtml(cells[1]);
      if (!key || !val) continue;
      if (JUNK_SPEC_KEYS.has(key.toLowerCase())) continue;
      if (key.length > 80) continue; // absurdly long keys are junk

      const dedup = `${key}||${val}`;
      if (seen.has(dedup)) continue;
      seen.add(dedup);
      if (specs[key] === undefined) specs[key] = val;
    }
    return specs;
  }

  // The prose description follows the spec table; strip the table out
  // first so the short description is free of spec noise.
  parseDescription(bodyHtml) {
    if (!bodyHtml) return '';
    const withoutTable = String(bodyHtml).replace(/<table[\s\S]*?<\/table>/i, ' ');
    return cleanText(stripHtml(withoutTable)) || '';
  }

  _num(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
}

module.exports = CustomMacBdScraper;
