// ─────────────────────────────────────────────────────────────
//  GadgetAndGearScraper — gadgetandgear.com
//
//  The storefront is a Next.js app backed by a public JSON API
//  (api-v3.gadgetandgear.com), so we scrape the API directly:
//  it is far more reliable and lighter than driving a browser.
//
//  Only the store-specific endpoints + field mapping live here;
//  pagination, retries, timeouts, de-duplication and the canonical
//  product shape come from ApiScraper / AbstractScraper.
// ─────────────────────────────────────────────────────────────
const ApiScraper = require('../core/ApiScraper');
const { extractKeySpecs, stripHtml, cleanText } = require('../../utils/parsers');

const API_BASE = 'https://api-v3.gadgetandgear.com/api/v1';
const STORE_URL = 'https://gadgetandgear.com';
const IMAGE_BASE = 'https://assets.gadgetandgear.com/upload/';
const PER_PAGE = 20;

class GadgetAndGearScraper extends ApiScraper {
  static storeKey = 'gadget-and-gear';

  constructor(overrides = {}) {
    super({
      storeName: 'Gadget & Gear',
      storeUrl: STORE_URL,
      apiBase: API_BASE,
      // Catalogue feeds to crawl. Phones by default; extend as needed.
      categories: overrides.categories || ['phone'],
      ...overrides,
    });
  }

  buildImageUrl(mediaPath) {
    if (!mediaPath) return null;
    if (/^https?:\/\//i.test(mediaPath)) return mediaPath;
    // The path may contain spaces / unicode, so encode each segment.
    const encoded = String(mediaPath)
      .split('/')
      .map((seg) => encodeURIComponent(seg))
      .join('/');
    return `${IMAGE_BASE}${encoded}`;
  }

  async fetchPage(category, pageNum) {
    const url = `${this.apiBase}/product/details-storefront?currentPage=${pageNum}&perPage=${PER_PAGE}&category=${encodeURIComponent(
      category
    )}&`;
    const body = await this.getJson(url, `list ${category} #${pageNum}`);
    const items = Array.isArray(body.data) ? body.data : [];
    const totalPage = Number(body.totalPage) || 0;
    const currentPage = Number(body.currentPage) || pageNum;
    return { items, hasNextPage: currentPage < totalPage };
  }

  getItemKey(item) {
    return item.slug || String(item.p_id);
  }

  async buildProduct(item) {
    const slug = item.slug;
    if (!slug) return null;

    const detail = await this.getJson(
      `${this.apiBase}/product/storefront/${encodeURIComponent(slug)}`,
      `detail ${slug}`
    );

    const specs = this.parseSpecifications(detail.specifications);
    const shortDescription = stripHtml(detail.shortDescription);

    // Price: prefer the primary SKU, fall back to the listing record.
    const sku = Array.isArray(detail.skus) && detail.skus.length ? detail.skus[0] : null;
    const mrp = this._num(sku?.price) ?? this._num(item.price);
    const sellRaw = this._num(sku?.discountedPrice) ?? this._num(item.discounted_price);
    const sell = sellRaw && sellRaw > 0 ? sellRaw : mrp;
    const originalPrice = mrp && sell && mrp > sell ? mrp : null;

    const stockStatus =
      cleanText(detail.stockStatus) || cleanText(item.stockStatus) || null;
    const inStock = /in\s*stock/i.test(stockStatus || '');

    const name = cleanText(detail.name) || cleanText(item.name);
    const brand =
      cleanText(detail.brand?.name) || cleanText(item.brand_name) || null;
    const category =
      cleanText(detail.category?.[0]?.name) || cleanText(item.category_name) || null;
    const imageUrl = this.buildImageUrl(detail.thumbnail || item.thumbnail);

    return {
      name,
      brand,
      category,
      productUrl: `${this.storeUrl}/product/${slug}`,
      imageUrl,
      price: sell ?? null,
      originalPrice,
      inStock,
      stockStatus,
      shortDescription,
      specs,
      keySpecs: extractKeySpecs(specs, name, shortDescription),
    };
  }

  /** Flatten the API's spec list into a { key: value } table. */
  parseSpecifications(specList) {
    const specs = {};
    if (!Array.isArray(specList)) return specs;
    for (const row of specList) {
      // Section headers carry isTitle=true and no real value.
      if (row.isTitle) continue;
      const key = cleanText(row.key);
      const value = cleanText(row.value);
      if (key && value) specs[key] = value;
    }
    return specs;
  }

  _num(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
}

module.exports = GadgetAndGearScraper;
