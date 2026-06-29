const axios = require('axios');
const cheerio = require('cheerio');
async function test() {
  try {
    const res = await axios.get('https://diamu.com.bd/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const $ = cheerio.load(res.data);
    const links = [];
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && (href.toLowerCase().includes('mobile') || href.toLowerCase().includes('phone') || href.toLowerCase().includes('smartphone'))) {
        links.push(href);
      }
    });
    console.log("Smartphone links:", [...new Set(links)]);
  } catch(e) {
    console.error(e.message);
  }
}
test();
