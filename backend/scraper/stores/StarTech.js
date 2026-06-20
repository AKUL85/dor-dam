// ─────────────────────────────────────────────────────────────
//  StarTechScraper.js  —  startech.com.bd  (FIXED v3)
//
//  NULL FIXES:
//  1. originalPrice  → looks for .price-old AFTER networkidle
//  2. ram/storage    → parsed from product name + description text
//  3. chipset/camera/os/network → parsed from description prose
//  4. Specs table    → waits for JS to render, broader selectors
//  5. "View More Info" junk → filtered out of specs
// ─────────────────────────────────────────────────────────────
const BaseScraper = require('../BaseScraper');

class StarTechScraper extends BaseScraper {
  constructor() {
    super({
      storeName: 'Star Tech',
      storeUrl:  'https://www.startech.com.bd',
      listPages: [
        'https://www.startech.com.bd/mobile-phone',
        'https://www.startech.com.bd/samsung-mobile-phone',
        'https://www.startech.com.bd/xiaomi-mobile-phone',
        'https://www.startech.com.bd/realme-mobile-phone',
        'https://www.startech.com.bd/oppo-mobile-phone',
        'https://www.startech.com.bd/vivo-mobile-phone',
        'https://www.startech.com.bd/apple-iphone',
      ],
      delayMs:  2000,
      maxPages: 15,
    });
  }

  // ── Read all <meta> tags into a plain object ─────────────────
  async getMeta(page) {
    return page.$$eval('meta[property], meta[name]', metas =>
      metas.reduce((acc, m) => {
        const key = m.getAttribute('property') || m.getAttribute('name');
        const val = m.getAttribute('content');
        if (key && val) acc[key] = val;
        return acc;
      }, {})
    );
  }

  // ── Step 1: Collect product links from listing page ──────────
  async getProductLinks(page, url) {
    try {
      await page.waitForSelector('.p-item, .product-layout', { timeout: 15000 });
      const links = await page.$$eval(
        '.p-item .p-item-img a, .p-item h4.p-item-name a, .product-layout .product-img a',
        els => els.map(a => a.href).filter(h => h && h.includes('startech.com.bd') && !h.includes('#'))
      );
      return [...new Set(links)];
    } catch (err) {
      this.log(`  No links on ${url}: ${err.message}`);
      return [];
    }
  }

  // ── Step 2: Pagination ───────────────────────────────────────
  async getNextPageUrl(page) {
    return page.$eval('.pagination li.active + li a', el => el.href).catch(() => null);
  }

  // ── Step 3: Parse a single product page ─────────────────────
  async parseProduct(page, productUrl) {

    // FIX: use networkidle so JS-rendered spec tables are fully loaded
    await page.goto(productUrl, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForSelector('h1', { timeout: 15000 });

    // ── Meta tags (price, image, stock, brand, title) ──────────
    const meta = await this.getMeta(page);

    const name  = meta['og:title'] || await page.$eval('h1', el => el.textContent.trim()).catch(() => null);
    if (!name) return null;

    // Price from meta — reliable
    const price = meta['product:price:amount']
      ? Math.round(parseFloat(meta['product:price:amount']))
      : null;

    // Image from meta — reliable
    const imageUrl = meta['og:image'] || null;

    // Stock from meta — reliable
    const availMeta = (meta['product:availability'] || '').toLowerCase();
    const inStock   = availMeta.includes('in stock') || availMeta === 'available';

    const brand = meta['product:brand'] || null;

    // ── FIX: Original/discounted price ──────────────────────────
    // Star Tech shows old price as strikethrough ONLY when discounted.
    // It sits next to the current price. Multiple possible selectors:
    const originalPriceRaw = await page.evaluate(() => {
      const selectors = [
        '.price-old',
        '.old-price',
        'del',           // HTML strikethrough element
        's.price',
        '.product-info del',
        '[class*="price"] del',
        '[class*="price"] s',
        '.regular-price',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim()) return el.textContent.trim();
      }
      return null;
    });
    const originalPrice = this.cleanPrice(originalPriceRaw);

    let discountAmt = null;
    let discountPct = null;
    if (originalPrice && price && originalPrice > price) {
      discountAmt = originalPrice - price;
      discountPct = Math.round((discountAmt / originalPrice) * 100);
    }

    // ── FIX: Get full page description text for spec parsing ────
    // Star Tech product descriptions contain all specs as prose paragraphs
    // e.g. "It has 8 GB of RAM, Exynos 1580 chipset, 5000mAh battery..."
    const descriptionText = await page.evaluate(() => {
      const selectors = [
        '.short-description',
        '#tab-description',
        '.product-description',
        '.tab-content',
        '#tab-specification',
        '.description',
        '[id*="description"]',
        '[class*="description"]',
      ];
      let text = '';
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) text += ' ' + el.textContent;
      }
      return text.replace(/\s+/g, ' ').trim();
    });

    // ── FIX: Parse spec table properly ──────────────────────────
    const specs = await this.parseSpecifications(page);

    // ── FIX: Extract keySpecs from BOTH specs table AND description text ──
    const keySpecs = this.extractKeySpecs(specs, name, descriptionText);

    return {
      name,
      brand,
      productUrl,
      price,
      originalPrice:  originalPrice || null,
      discountAmount: discountAmt,
      discountPct,
      inStock,
      imageUrl,
      specs,
      keySpecs,
    };
  }

  // ── Parse the spec table ─────────────────────────────────────
  async parseSpecifications(page) {
    const specs = {};

    // FIX: Broader selector list + filter out junk rows like "View More Info"
    const JUNK_KEYS = new Set([
      'view more info', 'see more', 'read more', 'specification', 'value',
      'feature', 'details', '', 'key features',
    ]);

    const rows = await page.evaluate(() => {
      // Try every possible spec table selector StarTech uses
      const selectors = [
        '#tab-specification table tr',
        '.tab-content table tr',
        '.short-description table tr',
        '.product-description table tr',
        'table.table tr',
        '.attribute-group tr',
        '.data-table tr',
        'table tr',                 // last resort: any table
      ];

      const results = [];
      const seen = new Set();

      for (const sel of selectors) {
        const rows = document.querySelectorAll(sel);
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) {
            const key = cells[0].textContent.trim().replace(/:$/, '');
            const val = cells[1].textContent.trim();
            const dedup = key + '||' + val;
            // Skip nav/footer table rows and duplicates
            if (key && val && key.length < 80 && !seen.has(dedup)) {
              seen.add(dedup);
              results.push({ key, val });
            }
          }
        });
        if (results.length > 3) break; // stop at first selector that works
      }

      return results;
    });

    if (rows.length > 0) {
      specs['Specifications'] = {};
      for (const { key, val } of rows) {
        // FIX: filter out "View More Info", "Bluetooth and Wireless FM radio: true" etc.
        if (JUNK_KEYS.has(key.toLowerCase())) continue;
        if (val === 'true' || val === 'false') continue;   // boolean artefacts
        if (val.toLowerCase().includes('view more')) continue;
        specs['Specifications'][key] = val;
      }
    }

    return specs;
  }

  // ── FIX: Extract keySpecs from table + description prose ─────
  extractKeySpecs(specs, productName = '', descriptionText = '') {
    // 1. Flatten spec table
    const flat = {};
    for (const section of Object.values(specs)) {
      if (typeof section === 'object') Object.assign(flat, section);
    }

    // 2. Spec table lookup
    const findInTable = (...keywords) => {
      for (const kw of keywords) {
        for (const [k, v] of Object.entries(flat)) {
          if (k.toLowerCase().includes(kw.toLowerCase())) return String(v).trim();
        }
      }
      return null;
    };

    // 3. FIX: Regex patterns to extract specs from description prose
    //    e.g. "It has 8 GB of RAM" / "8GB RAM" / "8 GB RAM"
    const prose = (descriptionText + ' ' + productName).toLowerCase();

    const findInProse = (patterns) => {
      for (const pattern of patterns) {
        const m = prose.match(pattern);
        if (m) return m[1] ? m[1].trim() : m[0].trim();
      }
      return null;
    };

    // RAM — "8 GB of RAM" / "8GB RAM" / "12GB RAM"
    const ramRaw = findInTable('RAM', 'Memory') || findInProse([
      /(\d+)\s*gb\s*(?:of\s*)?ram/i,
      /ram[:\s]+(\d+)\s*gb/i,
      /(\d+)\s*gb\s*lpddr/i,
    ]);
    const ramMatch = String(ramRaw || '').match(/(\d+)/);

    // Storage — "256GB storage" / "128 or 256 GB" / "256 GB internal"
    const storageRaw = findInTable('Storage', 'Internal Storage', 'ROM') || findInProse([
      /(\d+)\s*gb\s*(?:internal\s*)?storage/i,
      /storage[:\s]+(\d+)\s*gb/i,
      /(\d+)\s*gb\s*(?:internal|flash|emmc|ufs)/i,
    ]);
    const storMatch = String(storageRaw || '').match(/(\d+)/);

    // Chipset — "Exynos 1580" / "Snapdragon 8 Gen 3" / "MediaTek Dimensity 6300"
    const chipset = findInTable('Chipset', 'Processor', 'CPU', 'SoC') || findInProse([
      /(snapdragon[\s\w\d]+?(?=\s*(?:chip|process|with|,|\.|5nm|4nm|7nm|\d+\s*gb)))/i,
      /(exynos[\s\d]+)/i,
      /(dimensity[\s\d]+)/i,
      /(mediatek[\s\w]+?(?=\s*chip|\s*process|\s*with|,|\.))/i,
      /(helio[\s\w\d]+)/i,
      /(a\d+\s*bionic)/i,          // Apple chips
      /(apple\s+m\d[\w\s]*chip)/i,
    ]);

    // Battery — "5000mAh" / "5000 mAh battery"
    const battery = findInTable('Battery', 'Battery Capacity') || findInProse([
      /(\d{3,5}\s*mah)/i,
      /battery[:\s]+(\d{3,5}\s*mah)/i,
    ]);

    // Display — "6.7-inch Super AMOLED" / "6.7 inch Full HD+"
    const display = findInTable('Display', 'Screen Size', 'Screen') || findInProse([
      /(\d+\.\d+[-\s]inch[\w\s+]*?(?=\s*display|\s*screen|\s*with|,|\.))/i,
      /(\d+\.\d+["'″]\s*[\w\s+]*?(?:amoled|lcd|oled|ips|tft))/i,
    ]);

    // Camera — "50MP" / "64+12+5MP" / "triple 50+12+5"
    const camera = findInTable('Main Camera', 'Rear Camera', 'Camera') || findInProse([
      /(?:rear|main|triple|quad|dual)\s*camera[^.]*?(\d+mp[\w\s+\d]*)/i,
      /(\d+mp\s*\+\s*\d+mp(?:\s*\+\s*\d+mp)*)/i,
      /(\d+\s*mp\s*(?:main|wide|primary))/i,
    ]);

    // OS — "Android 15" / "One UI 7" / "iOS 18"
    const os = findInTable('OS', 'Operating System') || findInProse([
      /(android\s*\d+(?:\.\d+)?)/i,
      /(ios\s*\d+(?:\.\d+)?)/i,
      /(one\s*ui\s*\d+(?:\.\d+)?)/i,
    ]);

    // Network — "5G" / "4G LTE" / "2G"
    const network = findInTable('Network', 'Connectivity') || findInProse([
      /\b(5g)\b/i,
      /\b(4g\s*lte)\b/i,
      /\b(4g)\b/i,
      /\b(3g)\b/i,
      /\b(2g)\b/i,
    ]);

    return {
      ram:     ramMatch  ? parseInt(ramMatch[1])  : null,
      storage: storMatch ? parseInt(storMatch[1]) : null,
      chipset: chipset   ? chipset.trim()         : null,
      battery: battery   ? battery.trim()         : null,
      display: display   ? display.trim()         : null,
      camera:  camera    ? camera.trim()          : null,
      os:      os        ? os.trim()              : null,
      network: network   ? network.toUpperCase()  : null,
    };
  }
}

module.exports = StarTechScraper;