const axios = require('axios');
const cheerio = require('cheerio');
async function explore() {
  try {
    const res = await axios.get('https://www.gadgetmonkeybd.com/category/office-mobiles-zpvk6', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const $ = cheerio.load(res.data);
    
    console.log("Total nextzen-card-box items in office-mobiles:", $('.nextzen-card-box').length);
    $('.nextzen-card-box h3 a').each((i, el) => {
      console.log($(el).text().trim());
    });
  } catch(e) {
    console.error(e.message);
  }
}
explore();
