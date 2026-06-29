const axios = require('axios');
const cheerio = require('cheerio');
async function explore() {
  try {
    const res = await axios.get('https://gadgetmonkeybd.com/product/oneplus-pad-2-12256-gb-official-121-inch', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const $ = cheerio.load(res.data);
    
    console.log("Name:", $('h1, .product-title').first().text().trim());
    console.log("Brand:", $('.brand, .product-brand').text().trim());
    console.log("Price (ins/del):", $('.price del').text(), $('.price ins').text());
    console.log("Nextzen price:", $('.nextzen_regular_price').text().trim(), $('.nextzen_single_price').text().trim());
    
    console.log("\nSpec Table:");
    $('table tr').slice(0, 10).each((i, el) => {
      console.log("- " + $(el).find('th, td').first().text().replace(/\s+/g, ' ').trim() + " : " + $(el).find('td').last().text().replace(/\s+/g, ' ').trim());
    });
    
    console.log("\nOther spec sections:");
    $('.product-description ul li, .specification ul li').slice(0, 5).each((i, el) => {
      console.log("- " + $(el).text().replace(/\s+/g, ' ').trim());
    });
    
  } catch(e) {
    console.error(e.message);
  }
}
explore();
