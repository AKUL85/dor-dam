const axios = require('axios');
const cheerio = require('cheerio');
async function explore() {
  try {
    const res = await axios.get('https://kryinternational.com/products/category/phone', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const $ = cheerio.load(res.data);
    
    // Are there any script tags with JSON data?
    $('script').each((i, el) => {
      const src = $(el).attr('src');
      if (!src) {
        const content = $(el).html();
        if (content && content.includes('__NEXT_DATA__')) {
            console.log("Found Next.js data block!");
        } else if (content && content.includes('products')) {
            console.log("Found script with products");
        }
      }
    });

    // Also look for products inside the DOM directly
    const productLinks = [];
    $('a[href^="/products/"]').each((i, el) => {
        const href = $(el).attr('href');
        // skip category links
        if (!href.includes('/category/') && !href.includes('/brand/')) {
            productLinks.push(href);
        }
    });
    console.log("Product links without /category/:", [...new Set(productLinks)].slice(0, 10));

  } catch(e) {
    console.error(e.message);
  }
}
explore();
