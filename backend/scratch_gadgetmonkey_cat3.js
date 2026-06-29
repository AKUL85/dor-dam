const axios = require('axios');
const cheerio = require('cheerio');
async function explore() {
  try {
    const res = await axios.get('https://www.gadgetmonkeybd.com/category/mobile-tablets', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const $ = cheerio.load(res.data);
    
    console.log("Pagination links:");
    $('.pagination a, .page-link, a[rel="next"]').each((i, el) => {
      console.log($(el).text().trim(), $(el).attr('href'));
    });
    
  } catch(e) {
    console.error(e.message);
  }
}
explore();
