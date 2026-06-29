const CheerioScraper = require('../core/CheerioScraper');
const {
  cleanPrice,
  cleanText,
  extractKeySpecs,
} = require('../../utils/parsers');

const CATEGORY_PAGES = [
  'https://gadgetstudiobd.com/product-category/mobile-phones/',
  'https://gadgetstudiobd.com/product-category/apple/',
  'https://gadgetstudiobd.com/brand/apple/',
  'https://gadgetstudiobd.com/shop/'
];

// Brand slugs that are definitely not phones
const NON_PHONE_BRAND_SLUGS = new Set([
  'acefast', 'amazfit', 'anker', 'awei', 'baseus', 'borofone', 'earfun', 'edifier',
  'fiio', 'haylou', 'hoco', 'jbl', 'jisulife', 'kieslect', 'kospet', 'kz', 'ldnio',
  'mcdodo', 'memo', 'momax', 'oraimo', 'qcy', 'sharge', 'soundcore', 'soundpeats',
  'ugreen', 'wiwu', 'xundd', 'zeblaze', 'xiaoda', 'youpin', 'huohou', 'enchen', 'aisolove',
  'aecooly', 'qualitell', 'boat', 'sony'
]);

// Phone brands
const PHONE_BRAND_SLUGS = new Set([
  'apple', 'google', 'honor', 'huawei', 'infinix', 'motorola', 'nokia', 'nothing',
  'oneplus', 'oppo', 'realme', 'samsung', 'tecno', 'vivo', 'xiaomi'
]);

// Keyword fallback
const NAME_BRAND_KEYWORDS = [
  'iPhone', 'iPad', 'Galaxy', 'Redmi', 'Xiaomi', 'OnePlus', 'Pixel', 'Huawei',
  'Honor', 'Vivo', 'Realme', 'Oppo', 'Nokia', 'Infinix', 'Tecno', 'Motorola', 'Nothing'
];

// Patterns for accessories
const NON_PHONE_NAME_PATTERNS = [
  /\b(tablet|tab)\b/i,
  /\b(earbud|earphone|earphones|headphone|headphones|headset|neckband)\b/i,
  /\b(watch|smartwatch|smart watch|smartwatch)\b/i,
  /\b(smart band|fitness band)\b/i,
  /\b(charger|adapter|power bank|powerbank|cable|cord)\b/i,
  /\b(microphone|lavalier)\b/i,
  /\b(cover|case|glass|protector|stand|holder|cooler)\b/i,
  /\b(speaker|soundbar|amplifier|dac)\b/i,
  /\b(mouse|keyboard|laptop|notebook|mon(itor)?)\b/i,
  /\b(camera|lens|tripod|gimbal|selfie stick)\b/i,
  /\b(memory card|sd card|pendrive|usb drive)\b/i,
  /\b(router|access\s*point|hub|dock|adapter)\b/i,
  /\b(neck mount|over-ear|on-ear|in-ear)\b/i,
  /\b(trimmer|clipper|razor|fan|air\s*purifier|lint\s*remover|thermos|vacuum cleaner|juicer|iron|massager?|lamp|scale|dumbbells?|irrigator|washer|washing|straightener|fryer|bag|pen|manager|puzzle|sudoku|gluer|toolbox|light)\b/i,
  /\b(buds|earpods?|airpods?)\b/i,
  /\b(vision pro|pencil|tv|airtag)\b/i,
];

const JUNK_SPEC_KEYS = new Set([
  '', 'value', 'feature', 'features', 'specification', 'specifications',
  'details', 'view more info', 'see more', 'read more', 'key features',
  'general', 'description', 'reviews', 'additional information'
]);

class GadgetStudioBdScraper extends CheerioScraper {
  static storeKey = 'gadget-studio-bd';

  constructor(overrides = {}) {
    super({
      storeName: 'Gadget Studio BD',
      storeUrl: 'https://gadgetstudiobd.com',
      listPages: CATEGORY_PAGES,
      ...overrides,
    });
  }

  looksEmpty($) {
    const hasProducts = $('ul.products li.product, .products .product').length > 0;
    const hasTitle = $('h1.product_title, h1').length > 0;
    return !hasProducts && !hasTitle;
  }

  async run() {
    this.log.info('Scraping started', {
      store: this.storeName,
      url: this.storeUrl,
      categories: this.listPages.length,
    });

    const result = await super.run();

    this.log.info('Products found', { count: result.totalFound });
    if (result.totalErrors > 0) {
      this.log.error('Errors', {
        count: result.totalErrors,
        errors: result.errors,
      });
    }

    return result;
  }

  inferBrand(name, brandSlug) {
    if (brandSlug) {
      const slug = brandSlug.toLowerCase().trim();
      if (PHONE_BRAND_SLUGS.has(slug)) {
        return slug.charAt(0).toUpperCase() + slug.slice(1);
      }
      if (NON_PHONE_BRAND_SLUGS.has(slug)) return null;
    }

    const lower = String(name || '').toLowerCase();
    for (const kw of NAME_BRAND_KEYWORDS) {
      if (lower.includes(kw.toLowerCase())) return kw;
    }
    return null;
  }

  async getProductLinks($, url) {
    try {
      const selectors = '.product a[href*="/product/"], a[href*="/product/"]';

      const hrefs = [];
      $(selectors).each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.includes('gadgetstudiobd.com/product/') && !href.includes('/product-category/')) {
          hrefs.push(href);
        }
      });

      return [...new Set(hrefs)];
    } catch (err) {
      this.log.warn(`No links on ${url}`, { error: err.message });
      return [];
    }
  }

  async getNextPageUrl($, currentUrl) {
    const next =
      $('a.next.page-numbers').attr('href') ||
      $('.pagination a.next').attr('href') ||
      $('a[rel="next"]').attr('href') ||
      $('.woocommerce-pagination a.next').attr('href') ||
      null;
    if (!next) return null;
    try {
      const root = new URL(currentUrl);
      const nextUrl = new URL(next, currentUrl);
      if (nextUrl.origin !== root.origin) return null;
      return nextUrl.toString();
    } catch {
      return null;
    }
  }

  async parseProduct($, productUrl) {
    const text = (sel) => cleanText($(sel).first().text()) || null;

    const name =
      text('h1.product_title') ||
      text('h1') ||
      $('meta[property="og:title"]').attr('content') ||
      null;

    if (!name) return null;

    const brandHref = $('a[href*="/brand/"]').first().attr('href') || '';
    let brandSlug = null;
    const m = brandHref.match(/\/brand\/([^/]+)\/?/);
    if (m) brandSlug = decodeURIComponent(m[1]);

    const inferredBrand = this.inferBrand(name, brandSlug);
    if (!inferredBrand) {
      this.skipped += 1;
      this.log.debug('Skipping non-phone product', {
        productUrl,
        reason: 'brand-filter',
        name,
      });
      return null;
    }
    for (const pattern of NON_PHONE_NAME_PATTERNS) {
      if (pattern.test(name)) {
        this.skipped += 1;
        this.log.debug('Skipping non-phone product', {
          productUrl,
          reason: 'name-pattern',
          pattern: String(pattern),
          name,
        });
        return null;
      }
    }

    const descSelectors = [
      '#tab-description',
      '.woocommerce-Tabs-panel--description',
      '.woocommerce-Tabs-panel--additional_information',
      '.product-description',
      '.entry-content',
      '#content p',
    ];
    let descriptionText = '';
    for (const sel of descSelectors) {
      const txt = cleanText($(sel).text());
      if (txt) descriptionText += ' ' + txt;
    }
    descriptionText = descriptionText.trim();

    const priceBox = $('.price').first();
    const priceText = priceBox.length ? cleanText(priceBox.text()) : '';

    const originalPriceText = cleanText(
      priceBox.find('del, del .amount, del').first().text()
    );

    const currentPriceText = cleanText(
      priceBox.clone().find('del, s').remove().end().text()
    );

    const imageUrl = $('meta[property="og:image"]').attr('content') || 
                     $('.woocommerce-product-gallery img.wp-post-image').attr('src') || 
                     null;

    let inStock = false;
    const stockText = cleanText(
      $('.stock, .wd-single-stock-status').first().text()
    );
    if (stockText) {
      if (stockText.toLowerCase().includes('in stock')) inStock = true;
      if (stockText.toLowerCase().includes('out of stock')) inStock = false;
    } else {
      const bodyCls = ($('body').attr('class') || '').toLowerCase();
      if (bodyCls.includes('instock')) inStock = true;
      else if (bodyCls.includes('outofstock')) inStock = false;
    }

    const specRows = [];
    const seen = new Set();
    const specTableSelectors = [
      '.woocommerce-Tabs-panel--additional_information table tr',
      '.woocommerce-Tabs-panel--specification table tr',
      '#tab-additional_information table tr',
      '#tab-specification table tr',
      '.product-specs table tr',
      '.specification table tr',
      'table.shop_attributes tr',
    ].join(', ');

    $(specTableSelectors).each((_, row) => {
      const $row = $(row);
      const $th = $row.find('th');
      const $td = $row.find('td');

      if ($th.length === 1 && $th.attr('colspan')) return;

      let key = null;
      let val = null;
      if ($th.length >= 1 && $td.length >= 1) {
        key = cleanText($th.first().text());
        val = cleanText($td.first().text());
      } else if ($td.length >= 2) {
        key = cleanText($td.eq(0).text());
        val = cleanText($td.eq(1).text());
      }

      if (key) key = key.replace(/:$/, '');
      const dedup = `${key}||${val}`;
      if (key && val && !seen.has(dedup)) {
        seen.add(dedup);
        specRows.push({ key, val });
      }
    });

    let price = null;
    let originalPrice = null;

    const rangeMatch = (priceText || '').match(
      /([\d,]+(?:\.\d+)?)\s*(?:BDT|৳|tk)?\s*(?:through|-|to|–|—)\s*([\d,]+(?:\.\d+)?)/i
    );
    if (rangeMatch) {
      const low = cleanPrice(rangeMatch[1]);
      const high = cleanPrice(rangeMatch[2]);
      if (low !== null) price = low;
      if (high !== null) originalPrice = high;
    } else {
      price = cleanPrice(currentPriceText || priceText);
      originalPrice = cleanPrice(originalPriceText);
    }

    let discountAmount = null;
    let discountPct = null;
    if (originalPrice && price && originalPrice > price) {
      discountAmount = originalPrice - price;
      discountPct = Math.round((discountAmount / originalPrice) * 100);
    }

    const specs = {};
    for (const { key, val } of specRows) {
      if (JUNK_SPEC_KEYS.has(key.toLowerCase())) continue;
      if (val === 'true' || val === 'false') continue;
      if (val.toLowerCase().includes('view more')) continue;
      if (key.length > 80) continue;
      if (specs[key] === undefined) specs[key] = val;
    }

    const cleanedDescription = cleanText(descriptionText) || '';
    const keySpecs = extractKeySpecs(specs, name, cleanedDescription);

    this.log.info('Product details scraped', { name, productUrl });

    return {
      name,
      brand: inferredBrand,
      category: 'Mobile Phone',
      productUrl,
      imageUrl,
      price,
      originalPrice,
      discountAmount,
      discountPct,
      inStock: Boolean(inStock),
      stockStatus: inStock ? 'In Stock' : 'Out of Stock',
      shortDescription: cleanedDescription ? cleanedDescription.slice(0, 500) : null,
      specs,
      keySpecs,
    };
  }
}

module.exports = GadgetStudioBdScraper;
