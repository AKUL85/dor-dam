const axios = require('axios');
const cheerio = require('cheerio');
async function explore() {
  try {
    const res = await axios.get('https://kryinternational.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const $ = cheerio.load(res.data);
    const links = [];
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim().toLowerCase();
      if (href && (text.includes('smart') || text.includes('phone') || text.includes('mobile') || href.includes('mobile') || href.includes('phone') || href.includes('smartphone'))) {
        links.push({ text, href });
      }
    });
    console.log("Possible Mobile Categories:");
    console.log([...new Map(links.map(item => [item.href, item])).values()].slice(0, 15));
  } catch(e) {
    console.error(e.message);
  }
}
explore();
