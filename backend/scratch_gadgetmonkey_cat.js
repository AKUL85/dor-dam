const axios = require('axios');
const cheerio = require('cheerio');
async function explore() {
  try {
    const res = await axios.get('https://www.gadgetmonkeybd.com/category/mobile-tablets', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const $ = cheerio.load(res.data);
    
    console.log("Looking for products:");
    const products = $('.product, .product-card, .item');
    console.log("Products found (by common classes):", products.length);
    
    if (products.length > 0) {
      console.log("First product classes:", products.first().attr('class'));
    } else {
      // Dump links containing 'product'
      const links = [];
      $('a').each((i, el) => {
        const href = $(el).attr('href');
        if (href && href.includes('/product/')) links.push(href);
      });
      console.log("Product links found:", links.length);
      if (links.length > 0) console.log("Sample product link:", links[0]);
    }
    
    console.log("\nLooking for pagination:");
    console.log("Pagination next:", $('.pagination a.next, a.next').attr('href') || 'Not found');
    
  } catch(e) {
    console.error(e.message);
  }
}
explore();
