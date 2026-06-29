const axios = require('axios');
const cheerio = require('cheerio');
async function explore() {
  try {
    const res = await axios.get('https://kryinternational.com/products/category/phone', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const $ = cheerio.load(res.data);
    
    console.log("Looking for products:");
    // dump classes of anchors that have href starting with /products/
    const classes = [];
    $('a').each((i, el) => {
        const href = $(el).attr('href');
        if (href && href.startsWith('/products/') && href.length > 15) {
            classes.push({ href: href, parentClasses: $(el).parent().attr('class'), elClasses: $(el).attr('class') });
        }
    });
    console.log("Product links:", classes.slice(0, 5));
    
    console.log("\nLooking for pagination:");
    console.log("Pagination links:", $('.pagination a, a[rel="next"], .next').length);
    
  } catch(e) {
    console.error(e.message);
  }
}
explore();
