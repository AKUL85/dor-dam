const axios = require('axios');
const cheerio = require('cheerio');
async function explore() {
  try {
    const res = await axios.get('https://kryinternational.com/products/category/phone', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const $ = cheerio.load(res.data);
    
    // Log the actual HTML body to see what renders server-side
    console.log("Body length:", $('body').html().length);
    console.log("Body preview:", $('body').html().substring(0, 500));
    
    let nextData = $('#__NEXT_DATA__').html();
    if (nextData) {
        console.log("Has __NEXT_DATA__! Length:", nextData.length);
        const json = JSON.parse(nextData);
        // try to find products
        console.log("Keys in pageProps:", Object.keys(json.props.pageProps));
    } else {
        console.log("No __NEXT_DATA__ found.");
    }
  } catch(e) {
    console.error(e.message);
  }
}
explore();
