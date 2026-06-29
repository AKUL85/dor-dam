const axios = require('axios');
const cheerio = require('cheerio');
async function explore() {
  try {
    const res = await axios.get('https://gadgetmonkeybd.com/product/oneplus-pad-2-12256-gb-official-121-inch', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const $ = cheerio.load(res.data);
    
    // Find where the price 54000 is on this page!
    console.log("Where is 54000?");
    $('span, div, strong, del').each((i, el) => {
      const txt = $(el).text();
      if (txt.includes('54,000') || txt.includes('54000')) {
        console.log("Tag:", el.tagName, "Class:", $(el).attr('class'), "Text:", txt.replace(/\s+/g, ' ').trim());
      }
    });

  } catch(e) {
    console.error(e.message);
  }
}
explore();
