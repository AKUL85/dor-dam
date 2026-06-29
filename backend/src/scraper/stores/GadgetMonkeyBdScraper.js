const CheerioScraper = require('../core/CheerioScraper');
const {
  cleanPrice,
  stripHtml,
  extractKeySpecs,
  cleanText,
} = require('../../utils/parsers');

const NAME_BRAND_KEYWORDS = [
  'iPhone',
  'Apple',
  'Galaxy',
  'Samsung',
  'Redmi',
  'Xiaomi',
  'Poco',
  'OnePlus',
  'Pixel',
  'Google',
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
  'CMF',
  'ZTE',
  'Asus',
  'Sony',
  'iPad',
  'iQOO'
];

const NON_PHONE_NAME_PATTERNS = [
  // /\b(tablet|tab|pad)\b/i, // Some pads/tablets might be valid if they want them, but the prompt says ONLY mobile phones.
  /\b(earbud|earphone|earphones|headphone|headphones|headset|neckband)\b/i,
  /\b(watch|smartwatch|smart watch|smartwatch)\b/i,
  /\b(smart band|fitness band)\b/i,
  /\b(charger|adapter|power bank|powerbank|cable|cord)\b/i,
  /\b(cover|case|glass|protector|stand|holder|cooler)\b/i,
];

class GadgetMonkeyBdScraper extends CheerioScraper {
  static storeKey = 'gadget-monkey-bd';

  constructor(overrides = {}) {
    super({
      storeName: 'Gadget Monkey BD',
      storeUrl: 'https://gadgetmonkeybd.com',
      listPages: ['https://gadgetmonkeybd.com/category/mobile-tablets'],
      ...overrides,
    });
  }

  // ── Empty-page detection ───────────────────────────────────
  looksEmpty($) {
    const hasProductCards = $('.nextzen-card-box').length > 0;
    const hasTitle = $('h1').length > 0;
    return !hasProductCards && !hasTitle;
  }

  // ── Brand inference ──────────────────────────────────────────
  inferBrand(name) {
    const lower = String(name || '').toLowerCase();
    for (const kw of NAME_BRAND_KEYWORDS) {
      if (lower.includes(kw.toLowerCase())) {
        if (kw.toLowerCase() === 'iphone' || kw.toLowerCase() === 'ipad') return 'Apple';
        if (kw.toLowerCase() === 'galaxy') return 'Samsung';
        if (kw.toLowerCase() === 'pixel') return 'Google';
        if (kw.toLowerCase() === 'cmf') return 'Nothing';
        return kw;
      }
    }
    return null;
  }

  // ── Listing-page extraction ─────────────────────────────────
  async getProductLinks($, url) {
    try {
      const hrefs = [];
      $('.nextzen-card-box').each((_, el) => {
        const href = $(el).find('h3 a').attr('href') || $(el).find('a.d-block').attr('href');
        if (href && href.includes('gadgetmonkeybd.com/product/')) {
          hrefs.push(href);
        }
      });
      return [...new Set(hrefs)];
    } catch (error) {
      this.log.error('Error extracting product links', { url, error: error.message });
      return [];
    }
  }

  async getNextPageLink($, url) {
    try {
      const nextUrl = $('.pagination a.next, a[rel="next"]').attr('href');
      return nextUrl || null;
    } catch (error) {
      return null;
    }
  }

  // ── Product-page extraction ─────────────────────────────────
  async parseProduct($, url) {
    const name = cleanText($('h1, .product-title').first().text());
    if (!name) return null;

    // Filter out non-phones
    if (NON_PHONE_NAME_PATTERNS.some((regex) => regex.test(name))) {
      this.log.debug(`Skipping non-phone product: ${name}`);
      return null;
    }

    // The user requested ONLY mobile phones, let's also filter out things explicitly named "Pad" or "Tablet"
    if (/\b(tablet|tab|pad)\b/i.test(name) && !/\b(ipad)\b/i.test(name)) {
        this.log.debug(`Skipping tablet/pad product: ${name}`);
        return null;
    }

    const brand = this.inferBrand(name);
    if (!brand) {
      this.log.debug(`Skipping product with unknown brand: ${name}`);
      return null;
    }

    const priceText = $('.nextzen_single_price').text() || $('.product_price').text();
    const currentPrice = cleanPrice(priceText);
    
    if (!currentPrice) {
      this.log.debug(`Skipping product with no price: ${name}`);
      return null;
    }

    const oldPriceText = $('.nextzen_regular_price del').text();
    const originalPrice = cleanPrice(oldPriceText) || currentPrice;

    // Get stock status - Gadget Monkey uses badges or text
    const stockText = cleanText($('.availability, .stock').text()) || '';
    const isOutOfStock = stockText.toLowerCase().includes('out of stock') || $('.badge-danger').text().toLowerCase().includes('out of stock');

    // Extract image URL from lazyload data-src or src
    let imageUrl = null;
    const imgEl = $('.product-gallery img, .img-fit').first();
    if (imgEl.length) {
      imageUrl = imgEl.attr('data-src') || imgEl.attr('src');
    }

    const categoryName = 'Mobile Phones';

    // Parse specifications
    const rawSpecs = {};
    const descriptionText = cleanText($('.product-description, #description').text());

    $('table tr').each((_, el) => {
      const key = cleanText($(el).find('th, td').first().text());
      const val = cleanText($(el).find('td').last().text());
      if (key && val && key !== val && !key.toLowerCase().includes('price') && !key.toLowerCase().includes('earn') && !key.toLowerCase().includes('emi')) {
        rawSpecs[key] = val;
      }
    });

    const keySpecs = extractKeySpecs(rawSpecs, name, descriptionText);

    return this.normalizeProduct({
      name,
      brand,
      category: categoryName,
      productUrl: url,
      imageUrl,
      price: currentPrice,
      originalPrice: originalPrice,
      inStock: !isOutOfStock,
      specs: rawSpecs,
      keySpecs,
    });
  }
}

module.exports = { GadgetMonkeyBdScraper };
