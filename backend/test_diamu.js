const axios = require('axios');
const cheerio = require('cheerio');

async function explore() {
  try {
    const res = await axios.get('https://diamu.com.bd/product-category/mobile/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    const $ = cheerio.load(res.data);
    
    console.log("Looking for products:");
    const products = $('.product, .product-small');
    console.log("Products found:", products.length);
    
    if (products.length > 0) {
      const first = products.first();
      console.log("First product classes:", first.attr('class'));
      console.log("First product link:", first.find('a').attr('href') || first.find('.woocommerce-LoopProduct-link').attr('href') || first.find('a.product-link').attr('href') || 'No link found');
    } else {
      const links = [];
      $('a').each((i, el) => {
        const href = $(el).attr('href');
        if (href && href.includes('/product/')) links.push(href);
      });
      console.log("Links containing /product/:", links.slice(0, 10));
    }
    
    console.log("\nLooking for pagination:");
    console.log("Next link:", $('a.next.page-numbers, .pagination a.next, a.next').attr('href'));
    
    // Now fetch a product
    const prodLink = 'https://diamu.com.bd/product/nothing-phone-3a-lite/';
    console.log("\nFetching product:", prodLink);
    const prodRes = await axios.get(prodLink, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    
    const $p = cheerio.load(prodRes.data);
    console.log("Name:", $p('h1').text().trim());
    console.log("Price:", $p('.price').first().text().replace(/\s+/g, ' ').trim());
    console.log("Stock:", $p('.stock').text().trim() || $p('.in-stock').text().trim() || 'No explicit stock found');
    
    console.log("\nSpecs Table rows:");
    $p('table tr, .shop_attributes tr, .woocommerce-product-attributes tr').slice(0, 5).each((i, el) => {
      const key = $p(el).find('th').text().trim() || $p(el).find('td').first().text().trim();
      const val = $p(el).find('td').last().text().trim();
      console.log(`- ${key}: ${val}`);
    });
    
  } catch(e) {
    console.error(e.message);
  }
}
explore();
