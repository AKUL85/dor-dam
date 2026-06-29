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
  'Sony'
];

const NON_PHONE_NAME_PATTERNS = [
  /\b(tablet|tab)\b/i,
  /\b(earbud|earphone|earphones|headphone|headphones|headset|neckband)\b/i,
  /\b(watch|smartwatch|smart watch|smartwatch)\b/i,
  /\b(smart band|fitness band)\b/i,
  /\b(charger|adapter|power bank|powerbank|cable|cord)\b/i,
  /\b(cover|case|glass|protector|stand|holder|cooler)\b/i,
];

class DiamuScraper extends CheerioScraper {
  static storeKey = 'diamu';

  constructor(overrides = {}) {
    super({
      storeName: 'Diamu',
      storeUrl: 'https://diamu.com.bd',
      listPages: ['https://diamu.com.bd/product-category/mobile/'],
      ...overrides,
    });
  }

  // ── Empty-page detection ───────────────────────────────────
  looksEmpty($) {
    const hasProductLinks = $('a[href*="/product/"]').length > 0;
    const hasTitle = $('h1.product_title, h1').length > 0;
    return !hasProductLinks && !hasTitle;
  }

  // ── Brand inference ──────────────────────────────────────────
  inferBrand(name) {
    const lower = String(name || '').toLowerCase();
    for (const kw of NAME_BRAND_KEYWORDS) {
      if (lower.includes(kw.toLowerCase())) {
        if (kw.toLowerCase() === 'iphone') return 'Apple';
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
      $('.product-small').each((_, el) => {
        const href = $(el).find('a').first().attr('href');
        if (href && href.includes('diamu.com.bd/product/')) {
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
      const nextUrl = $('a.next.page-numbers, .pagination a.next').attr('href');
      return nextUrl || null;
    } catch (error) {
      return null;
    }
  }

  // ── Product-page extraction ─────────────────────────────────
  async parseProduct($, url) {
    const name = cleanText($('h1.product-title, h1.product_title, h1').first().text());
    if (!name) return null;

    // Reject known non-phone accessories that slip into the phone category
    if (NON_PHONE_NAME_PATTERNS.some((regex) => regex.test(name))) {
      this.log.debug(`Skipping non-phone product: ${name}`);
      return null;
    }

    const brand = this.inferBrand(name);
    
    // Fallback if not identified as a phone brand
    if (!brand) {
      this.log.debug(`Skipping product with unknown brand: ${name}`);
      return null;
    }

    // Price Extraction
    // Range prices like "৳ 31,000 – ৳ 46,000" or single price "৳ 31,000"
    const priceText = $('.price').first().text();
    let currentPrice = null;
    let originalPrice = null;

    // Handle range price or sale price
    const delPrice = $('.price del').text();
    const insPrice = $('.price ins').text();
    
    if (insPrice) {
      currentPrice = cleanPrice(insPrice);
      originalPrice = cleanPrice(delPrice);
    } else if (priceText.includes('–') || priceText.includes('-')) {
      // It's a range price, extract the first integer as the base price
      currentPrice = cleanPrice(priceText.split(/[-–]/)[0]);
    } else {
      currentPrice = cleanPrice(priceText);
    }

    if (!currentPrice) {
      this.log.debug(`Skipping product with no price: ${name}`);
      return null;
    }

    const stockText = cleanText($('.stock').text() || $('.in-stock').text());
    const isOutOfStock = stockText && stockText.toLowerCase().includes('out of stock');

    const imageUrl = $('.woocommerce-product-gallery__image img, .product-gallery img').first().attr('src') || null;
    
    const categoryName = cleanText($('.posted_in a').first().text()) || 'Mobile Phones';

    // Parse specifications from short description and product attributes
    const rawSpecs = {};
    let descriptionText = cleanText($('.product-short-description').text());

    // Extract bullet points from short description (often used for specs)
    $('.product-short-description ul li').each((_, el) => {
      const text = cleanText($(el).text());
      if (text && text.includes(':')) {
        const [key, ...valParts] = text.split(':');
        rawSpecs[key.trim()] = valParts.join(':').trim();
      } else if (text && text.includes('-')) {
        const [key, ...valParts] = text.split('-');
        rawSpecs[key.trim()] = valParts.join('-').trim();
      }
    });

    // Fallback to table shop_attributes
    $('.shop_attributes tr, .woocommerce-product-attributes tr').each((_, el) => {
      const key = cleanText($(el).find('th').text());
      const val = cleanText($(el).find('td').text());
      if (key && val) {
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
      originalPrice: originalPrice || currentPrice,
      inStock: !isOutOfStock,
      specs: rawSpecs,
      keySpecs,
    });
  }
}

module.exports = { DiamuScraper };
