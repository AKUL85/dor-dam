// ─────────────────────────────────────────────────────────────
//  GadgetBangladeshScraper — gadgetbangladesh.com.bd
//
//  Implements only the store-specific selector/parse logic for
//  Gadget Bangladesh, a WooCommerce storefront with the Woodmart
//  theme / Elementor. Their `/shop/` listing mixes every category
//  they sell (audio, accessories, smartwatches, power banks, …)
//  with any smartphones that happen to be in stock. The
//  "phone-only" filter is enforced in two places:
//    1. During listing — by following per-brand landing pages
//       (Apple/Samsung/Xiaomi/Realme/OnePlus/Oppo/Vivo/Google/
//       Huawei/Honor/Nothing/Infinix/Tecno/Motorola) and the
//       master `/shop/`, then collecting every product link.
//    2. As a safety net inside parseProduct() — by dropping any
//       product whose brand slug is one of the accessory brands
//       (jbl, anker, hoco, edifier, baseus, acefast, …) or whose
//       name clearly indicates earbuds / headphones / watches /
//       chargers / cables / cases / coolers / speakers / power
//       banks / laptops / etc.
//
//  This scraper uses the CheerioScraper base: axios + cheerio as
//  the primary fetch/parse path, with a transparent Playwright
//  fallback for any page that is not usable as static HTML. All
//  resilience (retries, rotating user-agents, timeouts, polite
//  delays, structured logging) is inherited from CheerioScraper.
//  Parsing helpers come from the shared parsers util.
//
//  NOTE: As of inspection, Gadget Bangladesh is primarily an
//  audio/accessories store with no smartphone category page; the
//  scraper therefore degrades gracefully to crawling `/shop/`
//  and emitting zero phones when none are listed.
// ─────────────────────────────────────────────────────────────
const CheerioScraper = require('../core/CheerioScraper');
const {
  cleanPrice,
  cleanText,
  extractKeySpecs,
} = require('../../utils/parsers');

// Gadget Bangladesh no longer exposes per-brand landing pages
// (they all return 404). The site keeps every product in the
// WooCommerce /shop/ archive, so we crawl that and rely on the
// brand/name filters below to keep only mobile phones.
const SHOP_PAGE = 'https://gadgetbangladesh.com.bd/shop/';

// Brand slugs (the last path segment of `/brand/<slug>/`) that
// are *not* smartphones — anything from these is an accessory.
const NON_PHONE_BRAND_SLUGS = new Set([
  'acefast',
  'aecooly',
  'amazfit',
  'anker',
  'awei',
  'baseus',
  'borofone',
  'cozoy',
  'dqg',
  'earfun',
  'edifier',
  'epz',
  'fiio',
  'haylou',
  'hoco',
  'ibasso',
  'jbl',
  'jisulife',
  'kbear',
  'kieslect',
  'kospet',
  'kz',
  'ldnio',
  'mcdodo',
  'memo',
  'momax',
  'oraimo',
  'pitaka',
  'plextone',
  'qcy',
  'sharge',
  'soundcore',
  'soundpeats',
  'tanchjim',
  'tangzu',
  'tribit',
  'ugreen',
  'valdus',
  'vgr',
  'wiwu',
  'xundd',
  'zeblaze',
]);

// Brands whose phones we *do* want, extracted from `/brand/<slug>/`.
const PHONE_BRAND_SLUGS = new Set([
  'apple',
  'google',
  'honor',
  'huawei',
  'infinix',
  'motorola',
  'nokia',
  'nothing',
  'oneplus',
  'oppo',
  'realme',
  'samsung',
  'tecno',
  'vivo',
  'xiaomi',
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
  'Vivo',
  'Realme',
  'Oppo',
  'Nokia',
  'Infinix',
  'Tecno',
  'Motorola',
  'Nothing',
];

// Product-name patterns that mean "this is *not* a phone".
const NON_PHONE_NAME_PATTERNS = [
  /\b(tablet|tab)\b/i,
  /\b(earbuds|earbud|earphone|earphones|headphone|headphones|headset|neckband)\b/i,
  /\b(watch|watches|smartwatch|smartwatches|smart watch|fitness band)\b/i,
  // Word-boundary "band" alone is too aggressive (Honor Band), but
  // "smart band" / "fitness band" is always an accessory.
  /\b(smart band|fitness band)\b/i,
  /\b(charger|adapter|power bank|powerbank|cable|cord)\b/i,
  /\b(microphone|lavalier)\b/i,
  /\b(cover|case|glass|protector|stand|holder|cooler)\b/i,
  /\b(speaker|soundbar|amplifier|dac)\b/i,
  /\b(mouse|mousepad|mouse\s*pad|keyboard|laptop|notebook|mon(itor)?)\b/i,
  /\b(camera|lens|tripod|gimbal|selfie stick)\b/i,
  /\b(memory card|sd card|pendrive|usb drive)\b/i,
  /\b(router|access\s*point|hub|dock|adapter)\b/i,
  /\b(neck mount|over-ear|on-ear|in-ear)\b/i,
  /\b(trimmer|razor|shaver|clipper|hair\s*clipper|fan|air\s*purifier|air\s*fryer|lint\s*remover|thermos|dehumidifier)\b/i,
  /\b(buds)\b/i,
  /\b(stylus|smart\s*pen|pen|toothbrush|screwdriver|toolkit|scalp|massager|lamp|flashlight|cup|iron|tv\s*box|media\s*player|streaming)\b/i,
];

// Breadcrumb categories that indicate a real phone product.
const PHONE_BREADCRUMB_CATEGORIES = new Set([
  'mobile phone',
  'mobile',
  'phone',
  'smartphone',
  'smart phone',
]);

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

class GadgetBangladeshScraper extends CheerioScraper {
  static storeKey = 'gadget-bangladesh';

  constructor(overrides = {}) {
    super({
      storeName: 'Gadget Bangladesh',
      storeUrl: 'https://gadgetbangladesh.com.bd',
      listPages: [SHOP_PAGE],
      // The /shop/ archive has 23 pages; phones are concentrated on
      // the later pages, so raise the page limit above the default.
      maxPages: 25,
      ...overrides,
    });
  }

  // ── Empty-page detection ───────────────────────────────────
  // If the cheerio-loaded markup has no usable product links, let
  // the base class fall back to a real browser for this page.
  looksEmpty($) {
    const hasProductLinks = $('a[href*="/product/"]').length > 0;
    const hasTitle = $('h1.product_title, h1').length > 0;
    return !hasProductLinks && !hasTitle;
  }

  // ── Main runner with explicit milestone logs ─────────────────
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

  // Extract the second item from the WooCommerce breadcrumb
  // (e.g. "Home > Trimmer > Product" => "Trimmer"). If the breadcrumb
  // is present and is not a phone category, the product is an accessory.
  getBreadcrumbCategory($) {
    const raw = cleanText(
      $('.woocommerce-breadcrumb, .breadcrumb, .breadcrumbs').first().text()
    );
    if (!raw) return null;
    const parts = raw.split(/[>/]/).map((p) => p.trim().toLowerCase());
    // Skip "Home" and return the first meaningful category.
    for (const part of parts) {
      if (part && part !== 'home') return part;
    }
    return null;
  }

  // ── Listing-page extraction ─────────────────────────────────
  async getProductLinks($, url) {
    try {
      // WooCommerce product loops render as <li> with class
      // "product" inside a `<ul.products>`. We also fall back to
      // any anchor under `.woocommerce-loop-product__link` /
      // `.product-thumbnail` / `.products a`, and general product links.
      const selectors = [
        'ul.products li.product a.woocommerce-loop-product__link',
        'ul.products li.product .product-thumbnail a',
        'ul.products li.product h2.woocommerce-loop-product__title a',
        'ul.products li.product a[href*="/product/"]',
        'a[href*="/product/"]'
      ].join(', ');

      const hrefs = [];
      $(selectors).each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.includes('gadgetbangladesh.com.bd/product/')) {
          hrefs.push(href);
        }
      });

      // De-dupe within this page only — the base scraper dedupes
      // the cross-page union.
      return [...new Set(hrefs)];
    } catch (err) {
      this.log.warn(`No links on ${url}`, { error: err.message });
      return [];
    }
  }

  // Gadget Bangladesh uses `/page/N/` pagination on every
  // brand/category archive.
  async getNextPageUrl($, currentUrl) {
    const next =
      $('a.next.page-numbers').attr('href') ||
      $('.pagination a.next').attr('href') ||
      $('a[rel="next"]').attr('href') ||
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

  // ── Product-page parsing ────────────────────────────────────
  async parseProduct($, productUrl) {
    const text = (sel) => cleanText($(sel).first().text()) || null;

    const name =
      text('h1.product_title') ||
      text('h1') ||
      $('meta[property="og:title"]').attr('content') ||
      null;

    if (!name) return null;

    // Brand link: Gadget Bangladesh uses `/brand/<slug>/` pills
    // on the product page.
    const brandHref = $('a[href*="/brand/"]').first().attr('href') || '';
    let brandSlug = null;
    const m = brandHref.match(/\/brand\/([^/]+)\/?/);
    if (m) brandSlug = decodeURIComponent(m[1]);

    // Description prose used both as short description and as
    // a backup source for keySpecs (RAM/storage/etc).
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

    // Price handling — WooCommerce renders "Price range: X through Y"
    // for variable products, or "Current price is: X" for simple
    // products, or sometimes just `৳X` inside `.price`.
    const priceBox = $('.price').first();
    const priceText = priceBox.length ? cleanText(priceBox.text()) : '';

    // The "strikethrough" original price lives in `.price del`.
    const originalPriceText = cleanText(
      priceBox.find('del, del .amount, del').first().text()
    );

    // Current/sale price is everything that is *not* inside a <del>.
    const currentPriceText = cleanText(
      priceBox.clone().find('del, s').remove().end().text()
    );

    // Image.
    const imageUrl = $('meta[property="og:image"]').attr('content') || null;

    // Stock status — WooCommerce sets an `.stock` class on the
    // page and a body class like `instock` / `outofstock` on
    // the `<body>` element. The Elementor/Woodmart single-product
    // widget also renders an explicit text under
    // `.wd-single-stock-status`.
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

    // Specs: WooCommerce's `Additional Information` tab uses a
    // `<table>` of `<tr><th>key</th><td>value</td></tr>` rows.
    // The custom "Specification" section also uses tables with
    // `<td>key</td><td>value</td>` cells (sometimes with section
    // header rows `<th colspan="2">Section</th>`).
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

      // Section divider row.
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

    // ── Phone-only filter (safety net) ────────────────────────
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

    // The breadcrumb category is the most reliable signal for this
    // store: phones are filed under "Mobile Phone", accessories under
    // "Trimmer", "Speaker", "Earbuds", etc. If the breadcrumb is
    // present and is not a phone category, treat the product as an accessory.
    const breadcrumbCategory = this.getBreadcrumbCategory($);
    if (
      breadcrumbCategory &&
      !PHONE_BREADCRUMB_CATEGORIES.has(breadcrumbCategory)
    ) {
      this.skipped += 1;
      this.log.debug('Skipping non-phone product', {
        productUrl,
        reason: 'breadcrumb-category',
        category: breadcrumbCategory,
        name,
      });
      return null;
    }

    // ── Price handling ────────────────────────────────────────
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

    // ── Specs ─────────────────────────────────────────────────
    const specs = {};
    for (const { key, val } of specRows) {
      if (JUNK_SPEC_KEYS.has(key.toLowerCase())) continue;
      if (val === 'true' || val === 'false') continue;
      if (val.toLowerCase().includes('view more')) continue;
      if (key.length > 80) continue; // absurdly long keys are junk
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

module.exports = GadgetBangladeshScraper;