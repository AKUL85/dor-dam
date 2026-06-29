const cheerio = require('cheerio');
const CheerioScraper = require('../core/CheerioScraper');
const { extractKeySpecs } = require('../../utils/parsers');

class KryInternationalScraper extends CheerioScraper {
  constructor(options = {}) {
    super({
      storeKey: 'kry-international',
      storeName: 'KRY International',
      baseUrl: 'https://kryinternational.com',
      listPages: ['https://kryinternational.com/products/category/phone'],
      // KRY is an App Router site with client-side rendering; 
      // standard Axios requests will not return HTML containing products.
      enableBrowserFallback: true,
      ...options
    });
  }

  // Override load to skip Axios completely and always use Playwright with networkidle
  async load(url, label) {
    this.log.debug(`[${label || url}] Using Playwright directly for KRY International`);
    
    if (!this._browser) {
      const Browser = require('../core/Browser');
      this._browser = new Browser({ headless: this.headless, logger: this.log });
      await this._browser.launch();
    }
    
    const page = await this._browser.newPage();
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(3000); // Give React time to render DOM
      const html = await page.content();
      return cheerio.load(html);
    } catch (err) {
      this.log.error(`Playwright failed for ${url}: ${err.message}`);
      throw err;
    } finally {
      await page.close().catch(() => {});
    }
  }

  async getProductLinks($, currentUrl) {
    const links = [];
    $('a[href^="/products/"]').each((_, el) => {
      const href = $(el).attr('href');
      // Skip non-product links
      if (
        href && 
        !href.includes('/category/') && 
        !href.includes('/brand/')
      ) {
        try {
          links.push(new URL(href, currentUrl).toString());
        } catch {
          // ignore invalid URLs
        }
      }
    });
    return [...new Set(links)];
  }

  async getNextPageUrl($, currentUrl) {
    let nextUrl = null;
    
    // Attempt standard patterns first
    const baseHref = await super.getNextPageUrl($, currentUrl);
    if (baseHref) return baseHref;
    
    // Look for "Next" links
    $('a').each((_, el) => {
        const text = $(el).text().toLowerCase().trim();
        const aria = ($(el).attr('aria-label') || '').toLowerCase();
        if (text === 'next' || aria === 'next' || text.includes('next page')) {
            const href = $(el).attr('href');
            if (href && href !== '#') {
                nextUrl = href;
            }
        }
    });

    if (nextUrl) {
      try {
        const next = new URL(nextUrl, currentUrl);
        if (next.origin === new URL(currentUrl).origin) {
          return next.toString();
        }
      } catch {
        return null;
      }
    }
    
    return null;
  }

  // ── Brand inference ──────────────────────────────────────────
  inferBrand(name) {
    const NAME_BRAND_KEYWORDS = [
      'iPhone', 'Apple', 'Galaxy', 'Samsung', 'Redmi', 'Xiaomi', 'Poco',
      'OnePlus', 'Pixel', 'Google', 'Huawei', 'Honor', 'Vivo', 'Realme',
      'Oppo', 'Nokia', 'Infinix', 'Tecno', 'Motorola', 'Nothing', 'CMF',
      'ZTE', 'Asus', 'Sony', 'iPad', 'iQOO', 'Zeta'
    ];
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

  async parseProduct($, productUrl) {
    // 1. Extract Name
    let name = $('h2.font-bold, h1').first().text().trim();
    if (!name) {
      // Fallback to title
      name = $('title').text().replace('| Kry International', '').trim();
    }
    if (!name || name.toLowerCase().includes('related products')) {
      // Something went wrong or page didn't load properly
      return null;
    }

    // Strictly enforce ONLY mobile phones
    const kw = name.toLowerCase();
    const nonPhonePatterns = /\b(watch|earbud|airpods?|tablet|pad|ipad|laptop|macbook|charger|cable|cover|glass|case|adapter|stand|mount)\b/i;
    if (nonPhonePatterns.test(kw)) {
      this.log.debug(`Skipping non-phone product: ${name}`);
      return null;
    }

    // 2. Determine Brand
    const brand = this.inferBrand(name);

    // 3. Extract Price
    let price = 0;
    
    // First try to find elements with "Total Price" specifically
    $('*').each((_, el) => {
       const text = $(el).text().trim();
       if (text.toLowerCase().includes('total price') && text.includes('৳') && text.length < 50 && $(el).children().length === 0) {
           const match = text.match(/([\d,]+)/);
           if (match && parseInt(match[1].replace(/,/g, ''), 10) > 100) {
               price = parseInt(match[1].replace(/,/g, ''), 10);
           }
       }
    });

    if (!price) {
        $('*').each((_, el) => {
           const text = $(el).text().trim();
           if ((text.includes('৳') || text.toLowerCase().includes('tk')) && text.length < 50 && $(el).children().length === 0) {
               const match = text.match(/([\d,]+)/);
               if (match && parseInt(match[1].replace(/,/g, ''), 10) > 1000) {
                   price = parseInt(match[1].replace(/,/g, ''), 10);
               }
           }
        });
    }

    if (!price) {
      this.log.warn(`Skipping ${name}: no price found`);
      return null;
    }

    // 4. Stock status
    const bodyText = $('body').text().toLowerCase();
    const inStock = !bodyText.includes('out of stock');

    // 5. Specs Extraction
    const specs = {};
    $('table tr').each((_, el) => {
      const th = $(el).find('th, td').first().text().trim();
      const td = $(el).find('td').last().text().trim();
      
      // Filter out headers that span the whole row (th == td)
      if (th && td && th.toLowerCase() !== td.toLowerCase()) {
        const key = th.replace(/:/g, '').trim();
        const value = td.replace(/:/g, '').trim();
        if (key && !specs[key]) {
           specs[key] = value;
        }
      }
    });

    const keySpecs = extractKeySpecs(specs);

    // 6. Image URL
    let imageUrl = $('img').first().attr('src') || '';
    if (imageUrl && !imageUrl.startsWith('http')) {
      try {
         imageUrl = new URL(imageUrl, productUrl).toString();
      } catch {}
    }

    return {
      name,
      brand,
      category: 'Mobile Phones',
      imageUrl,
      price,
      originalPrice: price, // Can be improved if KRY has old prices
      discountAmount: 0,
      discountPct: 0,
      inStock,
      stockStatus: inStock ? 'In Stock' : 'Out Of Stock',
      shortDescription: '',
      specs,
      keySpecs
    };
  }
}

module.exports = KryInternationalScraper;
