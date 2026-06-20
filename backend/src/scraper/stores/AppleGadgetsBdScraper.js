// ─────────────────────────────────────────────────────────────
//  AppleGadgetsBdScraper — applegadgetsbd.com
//
//  The storefront (Next.js) is backed by a public JSON API
//  (storeapi.applegadgetsbd.com), so we scrape the API directly.
//
//  Only the store-specific endpoints + field mapping live here;
//  pagination, retries, timeouts, de-duplication and the canonical
//  product shape come from ApiScraper / AbstractScraper.
// ─────────────────────────────────────────────────────────────
const ApiScraper = require('../core/ApiScraper');
const { extractKeySpecs, stripHtml, cleanText, localized } = require('../../utils/parsers');

const API_BASE = 'https://storeapi.applegadgetsbd.com/api';
const STORE_URL = 'https://www.applegadgetsbd.com';
const IMAGE_BASE = 'https://adminapi.applegadgetsbd.com/storage/media/large/';

class AppleGadgetsBdScraper extends ApiScraper {
  static storeKey = 'apple-gadgets-bd';

  constructor(overrides = {}) {
    super({
      storeName: 'Apple Gadgets',
      storeUrl: STORE_URL,
      apiBase: API_BASE,
      // Catalogue feeds to crawl. Phones by default; extend as needed.
      categories: overrides.categories || ['mobile-phone'],
      ...overrides,
    });
  }

  buildImageUrl(fileName) {
    if (!fileName) return null;
    if (/^https?:\/\//i.test(fileName)) return fileName;
    return `${IMAGE_BASE}${encodeURIComponent(fileName)}`;
  }

  slugOf(item) {
    const urls = Array.isArray(item.urls) ? item.urls : [];
    const def = urls.find((u) => u.default) || urls[0];
    return def?.slug || null;
  }

  async fetchPage(category, pageNum) {
    const url = `${this.apiBase}/category/${encodeURIComponent(category)}?page=${pageNum}`;
    const body = await this.getJson(url, `list ${category} #${pageNum}`);
    const items = Array.isArray(body.products) ? body.products : [];
    const hasNextPage = Boolean(body.meta && body.meta.next_page_url);
    return { items, hasNextPage };
  }

  getItemKey(item) {
    return this.slugOf(item) || String(item.id);
  }

  async buildProduct(item) {
    const slug = this.slugOf(item);
    if (!slug) return null;

    const body = await this.getJson(
      `${this.apiBase}/product/${encodeURIComponent(slug)}`,
      `detail ${slug}`
    );
    const detail = body.product || {};

    const specs = this.parseSpecifications(detail.specifications);
    const shortDescription = stripHtml(localized(detail.attribute_data?.short));

    // Price comes from the listing item's primary variant.
    const variant = item.variant || {};
    const priceObj = Array.isArray(variant.prices) && variant.prices.length ? variant.prices[0] : null;
    const sell = this._num(priceObj?.price?.value);
    const compare = this._num(priceObj?.compare_price?.value);
    const originalPrice = compare && sell && compare > sell ? compare : null;

    const status = cleanText(variant.status);
    const inStock = status ? /in-?stock/i.test(status) : this._num(variant.stock) > 0;
    const stockStatus = status ? status.replace(/-/g, ' ') : null;

    const name =
      cleanText(localized(detail.attribute_data?.name)) || cleanText(item.name);
    const brand = cleanText(localized(detail.brand?.attribute_data?.name)) || null;
    const category = this.firstCollectionName(detail.collections);
    const fileName =
      detail.media?.[0]?.file_name || item.media?.[0]?.file_name || null;

    return {
      name,
      brand,
      category,
      productUrl: `${this.storeUrl}/product/${slug}`,
      imageUrl: this.buildImageUrl(fileName),
      price: sell ?? null,
      originalPrice,
      inStock,
      stockStatus: stockStatus ? this._titleCase(stockStatus) : null,
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
      const key = cleanText(row.name);
      const value = cleanText(row.pivot?.details);
      if (key && value) specs[key] = value;
    }
    return specs;
  }

  /** The category name can be a plain string or a localised { en } object. */
  firstCollectionName(collections) {
    if (!Array.isArray(collections) || collections.length === 0) return null;
    const name = collections[0]?.attribute_data?.name;
    if (!name) return null;
    if (typeof name === 'string') return cleanText(name);
    return cleanText(name.en || Object.values(name)[0]);
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

module.exports = AppleGadgetsBdScraper;
