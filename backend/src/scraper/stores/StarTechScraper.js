// ─────────────────────────────────────────────────────────────
//  StarTechScraper — startech.com.bd
//
//  Implements only the store-specific selector/parse logic.
//  All resilience (retry, timeout, rate-limit, logging) is
//  inherited from BaseScraper, and parsing helpers come from
//  the shared parsers util.
// ─────────────────────────────────────────────────────────────
const BaseScraper = require('../core/BaseScraper');
const {
  cleanPrice,
  findInTable,
  findInProse,
  firstInt,
  flattenSpecs,
} = require('../../utils/parsers');

const JUNK_SPEC_KEYS = new Set([
  'view more info', 'see more', 'read more', 'specification', 'value',
  'feature', 'details', '', 'key features',
]);

class StarTechScraper extends BaseScraper {
  static storeKey = 'star-tech';

  constructor(overrides = {}) {
    super({
      storeName: 'Star Tech',
      storeUrl: 'https://www.startech.com.bd',
      listPages: [
        'https://www.startech.com.bd/mobile-phone',
        'https://www.startech.com.bd/samsung-mobile-phone',
        'https://www.startech.com.bd/xiaomi-mobile-phone',
        'https://www.startech.com.bd/realme-mobile-phone',
        'https://www.startech.com.bd/oppo-mobile-phone',
        'https://www.startech.com.bd/vivo-mobile-phone',
        'https://www.startech.com.bd/apple-iphone',
      ],
      ...overrides,
    });
  }

  // Read all <meta> tags into a plain object.
  async getMeta(page) {
    return page.$$eval('meta[property], meta[name]', (metas) =>
      metas.reduce((acc, m) => {
        const key = m.getAttribute('property') || m.getAttribute('name');
        const val = m.getAttribute('content');
        if (key && val) acc[key] = val;
        return acc;
      }, {})
    );
  }

  async getProductLinks(page, url) {
    try {
      await page.waitForSelector('.p-item, .product-layout', { timeout: 15000 });
      const links = await page.$$eval(
        '.p-item .p-item-img a, .p-item h4.p-item-name a, .product-layout .product-img a',
        (els) =>
          els
            .map((a) => a.href)
            .filter((h) => h && h.includes('startech.com.bd') && !h.includes('#'))
      );
      return [...new Set(links)];
    } catch (err) {
      this.log.warn(`No links on ${url}`, { error: err.message });
      return [];
    }
  }

  async getNextPageUrl(page) {
    return page.$eval('.pagination li.active + li a', (el) => el.href).catch(() => null);
  }

  async parseProduct(page, productUrl) {
    // networkidle so JS-rendered spec tables are fully loaded.
    await this.goto(page, productUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('h1', { timeout: 15000 });

    const meta = await this.getMeta(page);

    const name =
      meta['og:title'] ||
      (await page.$eval('h1', (el) => el.textContent.trim()).catch(() => null));
    if (!name) return null;

    const price = meta['product:price:amount']
      ? Math.round(parseFloat(meta['product:price:amount']))
      : null;
    const imageUrl = meta['og:image'] || null;
    const availMeta = (meta['product:availability'] || '').toLowerCase();
    const inStock = availMeta.includes('in stock') || availMeta === 'available';
    const brand = meta['product:brand'] || null;

    // Original (strikethrough) price, only present when discounted.
    const originalPriceRaw = await page.evaluate(() => {
      const selectors = [
        '.price-old', '.old-price', 'del', 's.price',
        '.product-info del', '[class*="price"] del', '[class*="price"] s',
        '.regular-price',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim()) return el.textContent.trim();
      }
      return null;
    });
    const originalPrice = cleanPrice(originalPriceRaw);

    let discountAmount = null;
    let discountPct = null;
    if (originalPrice && price && originalPrice > price) {
      discountAmount = originalPrice - price;
      discountPct = Math.round((discountAmount / originalPrice) * 100);
    }

    // Description prose is mined for specs not present in the table.
    const descriptionText = await page.evaluate(() => {
      const selectors = [
        '.short-description', '#tab-description', '.product-description',
        '.tab-content', '#tab-specification', '.description',
        '[id*="description"]', '[class*="description"]',
      ];
      let text = '';
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) text += ` ${el.textContent}`;
      }
      return text.replace(/\s+/g, ' ').trim();
    });

    const specs = await this.parseSpecifications(page);
    const keySpecs = this.extractKeySpecs(specs, name, descriptionText);

    return {
      name,
      brand,
      productUrl,
      price,
      originalPrice: originalPrice || null,
      discountAmount,
      discountPct,
      inStock,
      imageUrl,
      specs,
      keySpecs,
    };
  }

  async parseSpecifications(page) {
    const specs = {};

    const rows = await page.evaluate(() => {
      const selectors = [
        '#tab-specification table tr', '.tab-content table tr',
        '.short-description table tr', '.product-description table tr',
        'table.table tr', '.attribute-group tr', '.data-table tr', 'table tr',
      ];
      const results = [];
      const seen = new Set();
      for (const sel of selectors) {
        document.querySelectorAll(sel).forEach((row) => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) {
            const key = cells[0].textContent.trim().replace(/:$/, '');
            const val = cells[1].textContent.trim();
            const dedup = `${key}||${val}`;
            if (key && val && key.length < 80 && !seen.has(dedup)) {
              seen.add(dedup);
              results.push({ key, val });
            }
          }
        });
        if (results.length > 3) break;
      }
      return results;
    });

    if (rows.length > 0) {
      specs.Specifications = {};
      for (const { key, val } of rows) {
        if (JUNK_SPEC_KEYS.has(key.toLowerCase())) continue;
        if (val === 'true' || val === 'false') continue;
        if (val.toLowerCase().includes('view more')) continue;
        specs.Specifications[key] = val;
      }
    }

    return specs;
  }

  extractKeySpecs(specs, productName = '', descriptionText = '') {
    const flat = flattenSpecs(specs);
    const prose = `${descriptionText} ${productName}`.toLowerCase();

    const ram = firstInt(
      findInTable(flat, ['RAM', 'Memory']) ||
        findInProse(prose, [
          /(\d+)\s*gb\s*(?:of\s*)?ram/i,
          /ram[:\s]+(\d+)\s*gb/i,
          /(\d+)\s*gb\s*lpddr/i,
        ])
    );

    const storage = firstInt(
      findInTable(flat, ['Storage', 'Internal Storage', 'ROM']) ||
        findInProse(prose, [
          /(\d+)\s*gb\s*(?:internal\s*)?storage/i,
          /storage[:\s]+(\d+)\s*gb/i,
          /(\d+)\s*gb\s*(?:internal|flash|emmc|ufs)/i,
        ])
    );

    const chipset =
      findInTable(flat, ['Chipset', 'Processor', 'CPU', 'SoC']) ||
      findInProse(prose, [
        /(snapdragon[\s\w\d]+?(?=\s*(?:chip|process|with|,|\.|5nm|4nm|7nm|\d+\s*gb)))/i,
        /(exynos[\s\d]+)/i,
        /(dimensity[\s\d]+)/i,
        /(mediatek[\s\w]+?(?=\s*chip|\s*process|\s*with|,|\.))/i,
        /(helio[\s\w\d]+)/i,
        /(a\d+\s*bionic)/i,
        /(apple\s+m\d[\w\s]*chip)/i,
      ]);

    const battery =
      findInTable(flat, ['Battery', 'Battery Capacity']) ||
      findInProse(prose, [/(\d{3,5}\s*mah)/i, /battery[:\s]+(\d{3,5}\s*mah)/i]);

    const display =
      findInTable(flat, ['Display', 'Screen Size', 'Screen']) ||
      findInProse(prose, [
        /(\d+\.\d+[-\s]inch[\w\s+]*?(?=\s*display|\s*screen|\s*with|,|\.))/i,
        /(\d+\.\d+["'″]\s*[\w\s+]*?(?:amoled|lcd|oled|ips|tft))/i,
      ]);

    const camera =
      findInTable(flat, ['Main Camera', 'Rear Camera', 'Camera']) ||
      findInProse(prose, [
        /(?:rear|main|triple|quad|dual)\s*camera[^.]*?(\d+mp[\w\s+\d]*)/i,
        /(\d+mp\s*\+\s*\d+mp(?:\s*\+\s*\d+mp)*)/i,
        /(\d+\s*mp\s*(?:main|wide|primary))/i,
      ]);

    const os =
      findInTable(flat, ['OS', 'Operating System']) ||
      findInProse(prose, [
        /(android\s*\d+(?:\.\d+)?)/i,
        /(ios\s*\d+(?:\.\d+)?)/i,
        /(one\s*ui\s*\d+(?:\.\d+)?)/i,
      ]);

    const network =
      findInTable(flat, ['Network', 'Connectivity']) ||
      findInProse(prose, [/\b(5g)\b/i, /\b(4g\s*lte)\b/i, /\b(4g)\b/i, /\b(3g)\b/i, /\b(2g)\b/i]);

    return {
      ram: ram ?? null,
      storage: storage ?? null,
      chipset: chipset ? chipset.trim() : null,
      battery: battery ? battery.trim() : null,
      display: display ? display.trim() : null,
      camera: camera ? camera.trim() : null,
      os: os ? os.trim() : null,
      network: network ? network.toUpperCase() : null,
    };
  }
}

module.exports = StarTechScraper;
