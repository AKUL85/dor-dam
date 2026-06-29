const axios = require('axios');
const cheerio = require('cheerio');

async function testCategory() {
    try {
        const res = await axios.get('https://gadgetbd.com/product-category/smartphones/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(res.data);
        
        const products = [];
        $('.product, .type-product, .wc-block-grid__product').each((_, el) => {
            const href = $(el).find('a').first().attr('href') || $(el).attr('href') || $(el).find('.woocommerce-LoopProduct-link').attr('href');
            const title = $(el).find('.woocommerce-loop-product__title, h2, h3').text().trim();
            const price = $(el).find('.price').text().trim();
            if (href && title) {
                products.push({ title, href, price });
            }
        });
        
        console.log(`Found ${products.length} products`);
        console.log(products.slice(0, 3));
        
        // Also check pagination
        const nextLink = $('.next, .pagination-next, a.next').attr('href');
        console.log("Next link:", nextLink);
        
        if (products.length > 0) {
            console.log("Testing first product details...");
            const prodRes = await axios.get(products[0].href, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            const p$ = cheerio.load(prodRes.data);
            console.log("Product Name:", p$('h1.product_title, h1').text().trim());
            console.log("Price:", p$('.price').text().trim());
            console.log("Stock:", p$('.stock').text().trim());
            
            // Check specs
            console.log("Specs (first 3):");
            let c = 0;
            p$('table tr').each((_, tr) => {
                if (c++ < 3) console.log(p$(tr).text().trim().replace(/\s+/g, ' '));
            });
        }
        
    } catch (err) {
        console.error("Error:", err.message);
    }
}
testCategory();
