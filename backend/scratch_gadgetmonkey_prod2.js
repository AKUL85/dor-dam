const axios = require('axios');
const cheerio = require('cheerio');
async function explore() {
  try {
    const res = await axios.get('https://gadgetmonkeybd.com/product/oneplus-pad-2-12256-gb-official-121-inch', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const $ = cheerio.load(res.data);
    
    console.log("Prices:");
    console.log("Discount:", $('.discount-percentage').text().trim(), $('.badge').text().trim());
    
    let current = null;
    let old = null;
    // Look for prices in the HTML 
    $('strong, span, div').each((i, el) => {
      const txt = $(el).text().replace(/\s+/g, ' ').trim();
      if (txt.includes('৳') && txt.length < 20) {
        // console.log("Found price string:", txt);
      }
    });

    // Check specific nextzen classes
    console.log("nextzen_single_price:", $('.nextzen_single_price').text().trim());
    console.log("nextzen_regular_price:", $('.nextzen_regular_price').text().trim());
    console.log("product_price:", $('.product_price').text().trim());
    
    console.log("Stock:", $('.availability').text().trim() || $('.stock').text().trim());

  } catch(e) {
    console.error(e.message);
  }
}
explore();
