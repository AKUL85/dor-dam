const CheerioScraper = require('../core/CheerioScraper');
const { parsePrice, extractKeySpecs, cleanText } = require('../../utils/parsers');

class GadgetBdScraper extends CheerioScraper {
    static storeKey = 'gadget-bd';

    constructor(overrides = {}) {
        super({
            storeName: 'Gadget BD',
            storeUrl: 'https://gadgetbd.com',
            listPages: [
                'https://gadgetbd.com/product-category/smartphones/',
                'https://gadgetbd.com/product-category/iphone-accessories/iphone/'
            ],
            ...overrides,
        });
    }

    inferBrand(name) {
        const NAME_BRAND_KEYWORDS = [
          'iPhone', 'Apple', 'Galaxy', 'Samsung', 'Redmi', 'Xiaomi', 'Poco',
          'OnePlus', 'Pixel', 'Google', 'Huawei', 'Honor', 'Vivo', 'Realme',
          'Oppo', 'Nokia', 'Infinix', 'Tecno', 'Motorola', 'Nothing', 'CMF',
          'ZTE', 'Asus', 'Sony', 'iPad', 'iQOO'
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

    async getProductLinks($, url) {
        try {
            const hrefs = [];
            $('.product, .type-product, .wc-block-grid__product').each((_, el) => {
                const href = $(el).find('a').first().attr('href') || 
                             $(el).attr('href') || 
                             $(el).find('.woocommerce-LoopProduct-link').attr('href');
                
                if (href && href.includes('/product/')) {
                    hrefs.push(href);
                }
            });
            return [...new Set(hrefs)];
        } catch (error) {
            this.log.error('Error extracting product links', { url, error: error.message });
            return [];
        }
    }

    async parseProduct($, url) {
        try {
            const name = cleanText($('h1.product_title, h1').text());
            if (!name) return null;
            
            const imageUrl = $('.woocommerce-product-gallery__image img').first().attr('src') ||
                             $('.wp-post-image').first().attr('src') || '';
            
            let price = 0;
            let originalPrice = null;
            let discountAmount = 0;
            let discountPct = 0;
            
            // Try to extract from WooCommerce variations form first (very common on Gadget BD)
            const formVariations = $('form.variations_form').attr('data-product_variations');
            if (formVariations) {
                try {
                    const variations = JSON.parse(formVariations);
                    if (variations && variations.length > 0) {
                        // We take the first available variation
                        let firstVar = variations.find(v => v.is_in_stock) || variations[0];
                        price = firstVar.display_price;
                        originalPrice = firstVar.display_regular_price > price ? firstVar.display_regular_price : null;
                    }
                } catch(e) {
                    this.log.warn(`Could not parse variations form for ${url}`);
                }
            } 
            
            // Fallback for simple products
            if (!price) {
                const priceWrapper = $('p.price').first();
                if (priceWrapper.length) {
                    const insPrice = priceWrapper.find('ins').text().trim();
                    const delPrice = priceWrapper.find('del').text().trim();
                    
                    if (insPrice) {
                        price = parsePrice(insPrice);
                        if (delPrice) originalPrice = parsePrice(delPrice);
                    } else {
                        let pText = cleanText(priceWrapper.text());
                        const matches = pText.match(/([\d,]+)/g);
                        if (matches && matches.length > 0) {
                            price = parseInt(matches[0].replace(/,/g, ''), 10);
                        }
                    }
                }
            }
            
            // Safety check against zero pricing (like EMI placeholders)
            if (price && price < 1000) {
                const pText = cleanText($('p.price').text());
                const matches = pText.match(/([\d,]+)/g);
                if (matches) {
                    for(const m of matches) {
                        const val = parseInt(m.replace(/,/g, ''), 10);
                        if (val > 1000) {
                            price = val;
                            break;
                        }
                    }
                }
            }
            
            if (originalPrice && originalPrice > price) {
                discountAmount = originalPrice - price;
                discountPct = Math.round((discountAmount / originalPrice) * 100);
            } else {
                originalPrice = null;
            }

            const stockText = (cleanText($('.stock').text()) || '').toLowerCase();
            const inStock = !stockText.includes('out of stock') && !$('form.cart').hasClass('out-of-stock');
            
            const shortDescription = cleanText($('.woocommerce-product-details__short-description').text()) || null;
            
            const specs = {};
            // Parse typical WooCommerce attributes table
            $('.woocommerce-product-attributes tr, table tr').each((_, tr) => {
                const th = (cleanText($(tr).find('th').text()) || '').replace(':', '');
                const td = cleanText($(tr).find('td').text());
                
                if (th && td) {
                    specs[th] = td;
                } else {
                    const tds = $(tr).find('td');
                    if (tds.length >= 2) {
                        const k = (cleanText($(tds[0]).text()) || '').replace(':', '');
                        const v = cleanText($(tds[1]).text());
                        if (k && v && k.length < 30) {
                            specs[k] = v;
                        }
                    }
                }
            });
            
            const brand = this.inferBrand(name) || specs['Brand'] || 'Unknown';
            const category = 'Mobile Phones';

            const keySpecs = extractKeySpecs(specs);

            return this.normalizeProduct({
                name,
                brand,
                category,
                productUrl: url,
                imageUrl,
                price: price || 0,
                originalPrice,
                inStock,
                shortDescription,
                specs,
                keySpecs
            });
            
        } catch (error) {
            this.log.error('Error parsing product', { url, error: error.message });
            return null;
        }
    }
}

module.exports = GadgetBdScraper;
