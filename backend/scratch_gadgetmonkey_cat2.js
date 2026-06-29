const axios = require('axios');
const cheerio = require('cheerio');
async function explore() {
  try {
    const res = await axios.get('https://www.gadgetmonkeybd.com/category/mobile-tablets', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const $ = cheerio.load(res.data);
    
    console.log("Looking for pagination links:");
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && (href.includes('page') || text.includes('Next') || !isNaN(parseInt(text)))) {
        // console.log(text, href);
      }
    });

    console.log("\nProducts HTML structure:");
    const firstLink = $('a[href*="/product/"]').first();
    console.log(firstLink.parent().parent().parent().html());
    
  } catch(e) {
    console.error(e.message);
  }
}
explore();
