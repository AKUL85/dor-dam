// ─────────────────────────────────────────────────────────────
//  DazzleScraper — dazzle.com.bd
//
//  The storefront is a Next.js app backed by a public JSON:API
//  (api.dazzle.com.bd/api/v2), so we scrape the API directly — it
//  is far more reliable and lighter than driving a browser.
//
//  The category listing endpoint already embeds everything we need
//  (price, stock, brand, category and the full GSMArena-style
//  specifications), so — unlike a typical store — NO per-product
//  detail request is required.
//
//  Only the store-specific endpoint + field mapping live here;
//  pagination, retries, timeouts, de-duplication and the canonical
//  product shape come from ApiScraper / AbstractScraper.
// ─────────────────────────────────────────────────────────────
const ApiScraper = require('../core/ApiScraper');
const { extractKeySpecs, stripHtml, cleanText } = require('../../utils/parsers');

const API_BASE = 'https://api.dazzle.com.bd/api/v2';
const STORE_URL = 'https://dazzle.com.bd';
const PER_PAGE = 24;
// Relations the listing endpoint should embed in each product record.
const INCLUDE = 'price,category,brand,variantsCount,stock,attributes,campaigns.discounts';

// Known brands for name-based detection fallback (used only when the API
// record has no brand relation).
const BRAND_KEYWORDS = [
  'Samsung', 'Apple', 'iPhone', 'Xiaomi', 'Redmi', 'Poco', 'Realme', 'Oppo',
  'Vivo', 'iQOO', 'OnePlus', 'Infinix', 'Tecno', 'Itel', 'Nokia', 'Motorola',
  'Honor', 'Huawei', 'Google', 'Asus', 'Lenovo', 'Symphony', 'Walton', 'Lava',
  'Nothing', 'Sony', 'LG', 'HMD',
];

class DazzleScraper extends ApiScraper {
  static storeKey = 'dazzle';

  constructor(overrides = {}) {
    super({
      storeName: 'Dazzle',
      storeUrl: STORE_URL,
      apiBase: API_BASE,
      // Catalogue feeds to crawl. The parent "phones" category aggregates
      // every phone brand, so one feed covers the whole catalogue.
      categories: overrides.categories || ['phones'],
      ...overrides,
    });
  }

  // ── Phase 1: one listing page (24 products) ──────────────────
  async fetchPage(category, pageNum) {
    const url =
      `${this.apiBase}/categories/${encodeURIComponent(category)}/products` +
      `?page%5Bsize%5D=${PER_PAGE}&page%5Bnumber%5D=${pageNum}` +
      `&include=${encodeURIComponent(INCLUDE)}`;
    const body = await this.getJson(url, `list ${category} #${pageNum}`);

    const items = Array.isArray(body.data) ? body.data : [];
    const meta = body.meta || {};
    const current = Number(meta.current_page) || pageNum;
    const last = Number(meta.last_page) || current;
    return { items, hasNextPage: current < last };
  }

  getItemKey(item) {
    return item.slug || String(item.id);
  }

  // ── Phase 2: map a listing item -> canonical product ─────────
  //  No detail request needed: the listing already carries full data.
  async buildProduct(item) {
    const slug = item.slug;
    if (!slug) return null;

    const specs = this.parseSpecifications(item.specifications);
    const shortDescription = stripHtml(item.short_description);

    // Price: `price` is the selling price, `compare_price` the (higher) MRP.
    const price = this._num(item.price?.price);
    const compare = this._num(item.price?.compare_price);
    const originalPrice = compare && price && compare > price ? compare : null;

    const { inStock, stockStatus } = this.deriveStock(item);

    const name = cleanText(item.name);
    const brand = cleanText(item.brand?.name) || this.detectBrand(name);
    const category = cleanText(item.category?.name) || 'Phones';
    const imageUrl =
      item.thumbnail || (Array.isArray(item.images) && item.images[0]) || null;

    return {
      name,
      brand,
      category,
      productUrl: `${this.storeUrl}/product/${slug}`,
      imageUrl,
      price,
      originalPrice,
      inStock,
      stockStatus,
      shortDescription,
      specs,
      keySpecs: extractKeySpecs(specs, name, shortDescription || ''),
    };
  }

  /**
   * Flatten the GSMArena-style spec object — a map of section name to an
   * array of { name, value } rows — into a single flat { key: value } table.
   */
  parseSpecifications(specObj) {
    const specs = {};
    if (!specObj || typeof specObj !== 'object') return specs;
    for (const section of Object.values(specObj)) {
      if (!Array.isArray(section)) continue;
      for (const row of section) {
        const key = cleanText(row?.name);
        const value = cleanText(row?.value);
        if (key && value && !(key in specs)) specs[key] = value;
      }
    }
    return specs;
  }

  /**
   * Resolve availability. Prefer a concrete stock quantity when present,
   * otherwise fall back to the textual status (e.g. "stock").
   */
  deriveStock(item) {
    const status = cleanText(item.status);
    const qty =
      item.stock && typeof item.stock.quantity === 'number' ? item.stock.quantity : null;

    let inStock;
    if (qty !== null) inStock = qty > 0;
    else inStock = /^(stock|in[\s_-]?stock|available)$/i.test(status || '');

    let stockStatus;
    if (inStock) stockStatus = 'In Stock';
    else if (status) stockStatus = this._titleCase(status.replace(/[_-]+/g, ' '));
    else stockStatus = 'Out of Stock';

    return { inStock, stockStatus };
  }

  /** Best-effort brand detection from the product name. */
  detectBrand(name) {
    const lower = String(name || '').toLowerCase();
    for (const brand of BRAND_KEYWORDS) {
      if (lower.includes(brand.toLowerCase())) {
        if (brand === 'iPhone') return 'Apple';
        if (brand === 'Redmi' || brand === 'Poco') return 'Xiaomi';
        return brand;
      }
    }
    return null;
  }

  _titleCase(value) {
    return String(value)
      .split(' ')
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ');
  }

  _num(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
}

module.exports = DazzleScraper;
