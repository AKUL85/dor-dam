const CheerioScraper = require('../core/CheerioScraper');
const {
  cleanPrice,
  cleanText,
  extractKeySpecs,
} = require('../../utils/parsers');

// Categories that typically contain phones
const CATEGORY_PAGES = [
  'https://gadgetngadgetbd.com/category/phone/1',
];

// Brands that indicate a mobile phone
const PHONE_BRAND_SLUGS = new Set([
  'apple', 'samsung', 'google', 'xiaomi', 'oneplus',
  'motorola', 'nothing', 'realme', 'vivo', 'oppo', 'honor',
  'infinix', 'tecno', 'nokia'
]);

// Keywords used if the brand pill isn't found
const NAME_BRAND_KEYWORDS = [
  'iPhone', 'iPad', 'Galaxy', 'Redmi', 'Xiaomi', 'OnePlus', 'Pixel',
  'Huawei', 'Honor', 'Vivo', 'Realme', 'Oppo', 'Nokia', 'Infinix',
  'Tecno', 'Motorola', 'Nothing'
];

// Skip items with these words in the name
const NON_PHONE_NAME_PATTERNS = [
  /\b(case|cover|screen\s*protector|glass|film|shield)\b/i,
  /\b(cable|charger|adapter|power\s*bank|dock|hub)\b/i,
  /\b(earphone|headphone|earbud|airpod|earpod|headset|neckband)\b/i,
  /\b(watch|band|strap|bracelet|smartwatch)\b/i,
  /\b(speaker|soundbar|home\s*theater)\b/i,
  /\b(mouse|keyboard|stylus|pen|pencil|gamepad)\b/i,
  /\b(battery|display|replacement|part|tools?)\b/i,
  /\b(bag|backpack|sleeve|pouch)\b/i,
  /\b(router|wifi|modem|switch)\b/i,
  /\b(trimmer|clipper|razor|fan|air\s*purifier|vacuum\s*cleaner|juicer|iron|massager?|lamp|scale|dumbbells?|irrigator|washer|washing|straightener|fryer)\b/i,
  /\b(puzzle|sudoku|gluer|manager|light|tv|vision\s*pro|airtag)\b/i,
];

class GadgetNGadgetBdScraper extends CheerioScraper {
  static storeKey = 'gadget-n-gadget-bd';
  static storeName = 'Gadget N Gadget BD';
  static storeUrl = 'https://gadgetngadgetbd.com';

  constructor(overrides = {}) {
    super({
      storeName: 'Gadget N Gadget BD',
      storeUrl: 'https://gadgetngadgetbd.com',
      listPages: CATEGORY_PAGES,
      ...overrides,
    });
  }

  inferBrand(name) {
    const lower = String(name || '').toLowerCase();
    for (const kw of NAME_BRAND_KEYWORDS) {
      if (lower.includes(kw.toLowerCase())) return kw;
    }
    return null;
  }

  async getProductLinks($, url) {
    const allLinks = new Set();
    const productCards = $('.product-item');

    productCards.each((_, el) => {
      let link = $(el).find('.product-img > a').attr('href');
      if (link) {
        if (link.startsWith('/')) {
          link = `${GadgetNGadgetBdScraper.storeUrl}${link}`;
        }
        allLinks.add(link);
      }
    });

    return Array.from(allLinks);
  }

  async getNextPageUrl($, currentUrl) {
    const nextLink = $('.pagination .page-item.active').next().find('.page-link').attr('href');
    if (nextLink) {
      if (nextLink.startsWith('/')) {
        return `${GadgetNGadgetBdScraper.storeUrl}${nextLink}`;
      }
      return nextLink;
    }
    return null;
  }

  async parseProduct($, url) {
    const name = cleanText($('.details-product-title').text());
    if (!name) return null;

    // Strict filter for accessories based on name
    for (const pattern of NON_PHONE_NAME_PATTERNS) {
      if (pattern.test(name)) {
        return null;
      }
    }

    const brand = this.inferBrand(name);
    if (!brand) {
      return null; // Require a known phone brand
    }

    // Attempt to grab price
    // Usually formatted like ৳100,000
    const priceText = $('.product-price.price-section > span').first().text();
    const currentPrice = cleanPrice(priceText);
    
    if (!currentPrice || currentPrice < 5000) {
      // If it's too cheap, it's an accessory
      return null;
    }

    const oldPriceText = $('.product-price.price-section > del').first().text();
    const originalPrice = cleanPrice(oldPriceText);

    let discountAmount = null;
    let discountPct = null;
    if (originalPrice && originalPrice > currentPrice) {
      discountAmount = originalPrice - currentPrice;
      discountPct = Number(((discountAmount / originalPrice) * 100).toFixed(2));
    }

    // Image
    let imageUrl = $('meta[property="og:image"]').attr('content');
    if (!imageUrl) {
      imageUrl = $('.product-details-img img').first().attr('src');
    }
    if (imageUrl && imageUrl.startsWith('/')) {
      imageUrl = `${GadgetNGadgetBdScraper.storeUrl}${imageUrl}`;
    }

    // Availability
    // Their container #quick-view-stock contains .instock or .outstock
    const stockContainer = $('#quick-view-stock, .stock-status');
    let inStock = false;
    let stockStatus = 'Out of Stock';

    if (stockContainer.find('.instock').length > 0) {
      inStock = true;
      stockStatus = 'In Stock';
    } else if (stockContainer.text().toLowerCase().includes('in stock')) {
      inStock = true;
      stockStatus = 'In Stock';
    }

    // Description & Specs
    const shortDescription = cleanText($('.product-item-summery').text());
    
    // We'll collect raw text lines for spec parsing
    const rawSpecs = [];
    $('.product-item-summery ul li').each((_, el) => {
      rawSpecs.push(cleanText($(el).text()));
    });
    
    // Fallback or additional info from description tab
    $('#nav-description .description-content p, #nav-description .description-content li').each((_, el) => {
      rawSpecs.push(cleanText($(el).text()));
    });

    const combinedSpecText = rawSpecs.join(' | ');
    const keySpecs = extractKeySpecs(combinedSpecText);
    
    // Put all extracted summary into specs object
    const specs = {};
    if (brand) {
      specs.Brand = brand;
    }
    $('.product-item-summery ul li').each((_, el) => {
      const text = cleanText($(el).text());
      if (text.includes(':')) {
        const [k, v] = text.split(/:(.+)/);
        if (k && v) specs[cleanText(k)] = cleanText(v);
      }
    });

    return {
      name,
      brand,
      category: 'Mobile Phone',
      productUrl: url,
      imageUrl: imageUrl || '',
      price: currentPrice,
      originalPrice,
      discountAmount,
      discountPct,
      inStock,
      stockStatus,
      shortDescription,
      specs,
      keySpecs,
    };
  }
}

module.exports = GadgetNGadgetBdScraper;
