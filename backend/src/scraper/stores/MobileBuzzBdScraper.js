// ─────────────────────────────────────────────────────────────
//  MobileBuzzBdScraper — mobilebuzzbd.com
//
//  Implements only the store-specific selector/parse logic for
//  Mobile Buzz BD, a WooCommerce storefront whose `/phones/`
//  category aggregates *all* their listings (phones + accessories
//  + audio + wearables). The "phone-only" filter is enforced in
//  two places:
//    1. During listing — by following brand category pages
//       (Apple, Samsung, OnePlus, …) that contain only phones.
//    2. As a safety net inside parseProduct() — by dropping any
//       product whose brand path is one of the non-phone
//       brands (JBL, Anker, Soundcore, XUNDD, Haylou, Xiaomi
//       accessories) or whose name clearly indicates a tablet /
//       earbud / headphone / charger / cable / watch.
//
//  All resilience (browser lifecycle, retries, timeouts, rate-
//  limiting, structured logging) is inherited from BaseScraper,
//  and parsing helpers come from the shared parsers util.
// ─────────────────────────────────────────────────────────────
const BaseScraper = require('../core/BaseScraper');
const {
  cleanPrice,
  cleanText,
  extractKeySpecs,
} = require('../../utils/parsers');

// Brands whose `/brand/<slug>/` listing on Mobile Buzz BD is
// strictly mobile phones — crawl these directly so we never
// touch accessories/tablets/audio.
const PHONE_BRAND_LIST_PAGES = [
  'https://mobilebuzzbd.com/product-category/apple/iphone/',
  'https://mobilebuzzbd.com/product-category/phones/samsung-smart-phones/',
  'https://mobilebuzzbd.com/product-category/oneplus/oneplus-phones/',
  'https://mobilebuzzbd.com/product-category/phones/pixel-phones/',
  'https://mobilebuzzbd.com/product-category/xiaomi/xiaomi-phones/',
  'https://mobilebuzzbd.com/product-category/huawei/huawei-phones/',
  'https://mobilebuzzbd.com/product-category/phones/rog-phone-asus/',
  'https://mobilebuzzbd.com/product-category/vivo/',
  'https://mobilebuzzbd.com/product-category/realme/',
  'https://mobilebuzzbd.com/product-category/oppo/',
  'https://mobilebuzzbd.com/product-category/nokia/',
  'https://mobilebuzzbd.com/product-category/infinix/',
  'https://mobilebuzzbd.com/product-category/tecno/',
  'https://mobilebuzzbd.com/product-category/phones/honor-phones/',
  'https://mobilebuzzbd.com/product-category/motorola/',
  'https://mobilebuzzbd.com/product-category/itel/',
  'https://mobilebuzzbd.com/product-category/symphony/',
];

// Brand slugs (the last path segment of `/brand/<slug>/`) that
// are *not* smartphones — anything from these is an accessory.
const NON_PHONE_BRAND_SLUGS = new Set([
  'jbl',
  'anker',
  'soundcore',
  'xundd',
  'haylou',
  'xiaomi', // xiaomi brand page mixes microphones/earphones with phones
  'benco',
  'dexgen',
]);

// Brands whose phones we *do* want, extracted from `/brand/<slug>/`.
const PHONE_BRAND_SLUGS = new Set([
  'apple',
  'samsung',
  'oneplus',
  'google',
  'huawei',
  'asus',
  'vivo',
  'realme',
  'oppo',
  'nokia',
  'infinix',
  'tecno',
  'honor',
  'motorola',
  'itel',
  'symphony',
  'nothing',
]);

// Brand keywords recognised in product names as a final fallback
// when neither the brand link nor a taxonomy is available.
const NAME_BRAND_KEYWORDS = [
  'iPhone',
  'iPad',
  'Galaxy',
  'Redmi',
  'Xiaomi',
  'OnePlus',
  'Pixel',
  'Huawei',
  'Honor',
  'Asus ROG',
  'Vivo',
  'Realme',
  'Oppo',
  'Nokia',
  'Infinix',
  'Tecno',
  'Motorola',
  'Itel',
  'Symphony',
  'Benco',
  'Nothing',
];

// Product-name patterns that mean "this is *not* a phone".
const NON_PHONE_NAME_PATTERNS = [
  /\b(tablet|tab)\b/i,
  /\b(earbud|earphone|headphone|headset|neckband)\b/i,
  /\b(watch|smartwatch|smart watch)\b/i,
  // Word-boundary "band" alone is too aggressive (Honor Band), but
  // "smart band" / "fitness band" is always an accessory.
  /\b(smart band|fitness band)\b/i,
  /\b(charger|adapter|power bank|powerbank|cable|cord)\b/i,
  /\b(microphone|lavalier)\b/i,
  /\b(cover|case|glass|protector|stand|holder|cooler)\b/i,
  /\b(speaker|soundbar)\b/i,
  /\b(mouse|keyboard|laptop|notebook|mon(itor)?)\b/i,
  /\b(camera|lens|tripod|gimbal)\b/i,
  /\b(memory card|sd card|pendrive|usb drive)\b/i,
  /\b(neck mount|over-ear|on-ear|in-ear)\b/i,
];

// Generic keys we never want in the cleaned `specs` map.
const JUNK_SPEC_KEYS = new Set([
  '',
  'value',
  'feature',
  'features',
  'specification',
  'specifications',
  'details',
  'view more info',
  'see more',
  'read more',
  'key features',
  'general',
  'description',
  'reviews',
  'additional information',
]);

class MobileBuzzBdScraper extends BaseScraper {
  static storeKey = 'mobile-buzz-bd';

  constructor(overrides = {}) {
    super({
      storeName: 'Mobile Buzz BD',
      storeUrl: 'https://mobilebuzzbd.com',
      listPages: PHONE_BRAND_LIST_PAGES,
      ...overrides,
    });
  }

  // ── Brand inference ──────────────────────────────────────────
  // Try the brand taxonomy link first, then fall back to scanning
  // the product name. Returns the canonical brand string or null.
  inferBrand(name, brandSlug) {
    if (brandSlug) {
      const slug = brandSlug.toLowerCase().trim();
      if (PHONE_BRAND_SLUGS.has(slug)) {
        return slug.charAt(0).toUpperCase() + slug.slice(1);
      }
      if (NON_PHONE_BRAND_SLUGS.has(slug)) return null; // accessory brand
    }

    const lower = String(name || '').toLowerCase();
    for (const kw of NAME_BRAND_KEYWORDS) {
      if (lower.includes(kw.toLowerCase())) return kw;
    }
    return null;
  }

  // ── Listing-page extraction ─────────────────────────────────
  async getProductLinks(page, url) {
    try {
      // WooCommerce product loops render as <li> with class
      // "product" inside a `<ul.products>`. We also fall back to
      // any anchor under `.woocommerce-loop-product__link` /
      // `.product-thumbnail` / `.products a`.
      const links = await page.$$eval(
        [
          'ul.products li.product a.woocommerce-loop-product__link',
          'ul.products li.product .product-thumbnail a',
          'ul.products li.product h2.woocommerce-loop-product__title a',
          'ul.products li.product a[href*="/product/"]',
        ].join(', '),
        (els) =>
          els
            .map((a) => a.href)
            .filter((h) => h && h.includes('mobilebuzzbd.com/product/'))
      );

      // De-dupe within this page only — the base scraper dedupes
      // the cross-page union.
      return [...new Set(links)];
    } catch (err) {
      this.log.warn(`No links on ${url}`, { error: err.message });
      return [];
    }
  }

  // Mobile Buzz BD uses `/page/N/` pagination.
  async getNextPageUrl(page, currentUrl) {
    try {
      const next = await page.$eval(
        'a.next.page-numbers, .pagination a.next, a[rel="next"]',
        (el) => el.href
      );
      if (!next) return null;
      // Safety: the link must live under the same listing root
      // we are currently crawling.
      const root = new URL(currentUrl);
      const nextUrl = new URL(next);
      if (nextUrl.origin !== root.origin) return null;
      return nextUrl.toString();
    } catch {
      return null;
    }
  }

  // ── Product-page parsing ────────────────────────────────────
  async parseProduct(page, productUrl) {
    await this.goto(page, productUrl, { waitUntil: 'domcontentloaded' });
    await page
      .waitForSelector('h1.product_title, h1', { timeout: 15000 })
      .catch(() => {});

    const raw = await page.evaluate(() => {
      const text = (sel) => {
        const el = document.querySelector(sel);
        return el ? el.textContent.trim().replace(/\s+/g, ' ') : null;
      };

      const name =
        text('h1.product_title') ||
        text('h1') ||
        (document.querySelector('meta[property="og:title"]') || {}).content ||
        null;

      // Brand link: Mobile Buzz BD puts a small `<a href="/brand/…">`
      // pill on the product page.
      const brandAnchor = document.querySelector('a[href*="/brand/"]');
      let brandSlug = null;
      if (brandAnchor) {
        const m = brandAnchor.getAttribute('href').match(/\/brand\/([^/]+)\/?/);
        if (m) brandSlug = decodeURIComponent(m[1]);
      }

      // Description prose used both as short description and as
      // a backup source for keySpecs (RAM/storage/etc).
      const descSelectors = [
        '#tab-description',
        '.woocommerce-Tabs-panel--description',
        '.product-description',
        '.entry-content',
        '#content p',
      ];
      let descriptionText = '';
      for (const sel of descSelectors) {
        const el = document.querySelector(sel);
        if (el) descriptionText += ' ' + el.textContent.replace(/\s+/g, ' ').trim();
      }
      descriptionText = descriptionText.trim();

      // Price handling — WooCommerce renders "Price range: X through Y"
      // for variable products, or "Current price is: X" for simple
      // products, or sometimes just `৳X` inside `.price`.
      const priceBox = document.querySelector('.price');
      const priceText = priceBox ? priceBox.textContent.replace(/\s+/g, ' ') : '';

      // The "strikethrough" original price lives in `.price del` / `del`
      // (WooCommerce's regular-price markup).
      const originalEl = document.querySelector('.price del, del .amount, del');
      const originalPriceText = originalEl ? originalEl.textContent : null;

      // Current/sale price is everything that is *not* inside a <del>.
      const priceClone = priceBox ? priceBox.cloneNode(true) : null;
      if (priceClone) priceClone.querySelectorAll('del, s').forEach((n) => n.remove());
      const currentPriceText = priceClone ? priceClone.textContent : null;

      // Image.
      const imageUrl =
        (document.querySelector('meta[property="og:image"]') || {}).content || null;

      // Stock status — WooCommerce sets an `.stock` class on the page
      // and renders "In Stock" / "Out of stock" text near the button.
      const stockEl = document.querySelector('.stock, .availability .stock, p.stock');
      const stockText = stockEl ? stockEl.textContent.toLowerCase() : '';
      let inStock = stockText.includes('in stock');
      // Fallback: the "ADD TO CART" button only renders for in-stock
      // products; "READ MORE" / "ORDER NOW" only appears for available ones.
      if (!stockEl) {
        const buttons = Array.from(
          document.querySelectorAll('button, .button')
        ).map((b) => b.textContent.toLowerCase());
        if (buttons.some((t) => t.includes('add to cart'))) inStock = true;
      }

      // Specs: WooCommerce's `Additional Information` tab uses a
      // `<table>` of `<tr><th>key</th><td>value</td></tr>` rows.
      // The custom "Specification" section also uses tables with
      // `<td>key</td><td>value</td>` cells (sometimes with section
      // header rows `<th colspan="2">Section</th>`).
      const specRows = [];
      const seen = new Set();
      document
        .querySelectorAll(
          [
            '.woocommerce-Tabs-panel--additional_information table tr',
            '.woocommerce-Tabs-panel--specification table tr',
            '#tab-additional_information table tr',
            '#tab-specification table tr',
            '.product-specs table tr',
            '.specification table tr',
            'table.shop_attributes tr',
          ].join(', ')
        )
        .forEach((row) => {
          // Section divider row: a single <th colspan="2"> or <td colspan>.
          const thCells = row.querySelectorAll('th');
          const tdCells = row.querySelectorAll('td');
          if (thCells.length === 1 && thCells[0].hasAttribute('colspan')) {
            return; // ignore section headers
          }
          // Two-cell row (th+td or td+td).
          if (thCells.length >= 1 && tdCells.length >= 1) {
            const key = thCells[0].textContent.trim().replace(/:$/, '');
            const val = tdCells[0].textContent.replace(/\s+/g, ' ').trim();
            const dedup = `${key}||${val}`;
            if (key && val && !seen.has(dedup)) {
              seen.add(dedup);
              specRows.push({ key, val });
            }
          } else if (tdCells.length >= 2) {
            const key = tdCells[0].textContent.trim().replace(/:$/, '');
            const val = tdCells[1].textContent.replace(/\s+/g, ' ').trim();
            const dedup = `${key}||${val}`;
            if (key && val && !seen.has(dedup)) {
              seen.add(dedup);
              specRows.push({ key, val });
            }
          }
        });

      return {
        name,
        brandSlug,
        descriptionText,
        priceText,
        currentPriceText,
        originalPriceText,
        inStock,
        imageUrl,
        specRows,
      };
    });

    if (!raw.name) return null;

    // ── Phone-only filter (safety net) ────────────────────────
    const inferredBrand = this.inferBrand(raw.name, raw.brandSlug);
    if (!inferredBrand) {
      this.skipped += 1;
      this.log.debug(`Skipping non-phone product`, {
        productUrl,
        reason: 'brand-filter',
        name: raw.name,
      });
      return null;
    }
    for (const pattern of NON_PHONE_NAME_PATTERNS) {
      if (pattern.test(raw.name)) {
        this.skipped += 1;
        this.log.debug(`Skipping non-phone product`, {
          productUrl,
          reason: 'name-pattern',
          pattern: String(pattern),
          name: raw.name,
        });
        return null;
      }
    }

    // ── Price handling ────────────────────────────────────────
    // "Price range: X through Y" means variable product; pick the
    // lower bound as the canonical `price` and the upper as
    // `originalPrice` (WooCommerce never applies a strikethrough on
    // variable products, so this is the best approximation we have).
    let price = null;
    let originalPrice = null;

    const rangeMatch = (raw.priceText || '').match(
      /([\d,]+(?:\.\d+)?)\s*(?:BDT|৳|tk)?\s*(?:through|-|to|–|—)\s*([\d,]+(?:\.\d+)?)/i
    );
    if (rangeMatch) {
      const low = cleanPrice(rangeMatch[1]);
      const high = cleanPrice(rangeMatch[2]);
      if (low !== null) price = low;
      if (high !== null) originalPrice = high;
    } else {
      price = cleanPrice(raw.currentPriceText || raw.priceText);
      originalPrice = cleanPrice(raw.originalPriceText);
    }

    let discountAmount = null;
    let discountPct = null;
    if (originalPrice && price && originalPrice > price) {
      discountAmount = originalPrice - price;
      discountPct = Math.round((discountAmount / originalPrice) * 100);
    }

    // ── Specs ─────────────────────────────────────────────────
    const specs = {};
    for (const { key, val } of raw.specRows) {
      if (JUNK_SPEC_KEYS.has(key.toLowerCase())) continue;
      if (val === 'true' || val === 'false') continue;
      if (val.toLowerCase().includes('view more')) continue;
      if (key.length > 80) continue; // absurdly long keys are junk
      if (specs[key] === undefined) specs[key] = val;
    }

    const descriptionText = cleanText(raw.descriptionText) || '';
    const keySpecs = extractKeySpecs(specs, raw.name, descriptionText);

    return {
      name: raw.name,
      brand: inferredBrand,
      category: 'Mobile Phone',
      productUrl,
      price,
      originalPrice,
      discountAmount,
      discountPct,
      inStock: Boolean(raw.inStock),
      stockStatus: raw.inStock ? 'In Stock' : 'Out of Stock',
      shortDescription: descriptionText ? descriptionText.slice(0, 500) : null,
      imageUrl: raw.imageUrl,
      specs,
      keySpecs,
    };
  }
}

module.exports = MobileBuzzBdScraper;