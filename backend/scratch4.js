const axios = require('axios');
const cheerio = require('cheerio');
async function test() {
  const prodRes = await axios.get('https://diamu.com.bd/product/nothing-phone-3a-lite/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const $p = cheerio.load(prodRes.data);
  
  console.log("Short Description:");
  console.log($p('.product-short-description').text().trim());

  console.log("\nTab Description:");
  console.log($p('#tab-description, .tab-panels .panel').first().text().replace(/\s+/g, ' ').substring(0, 500));
  
  console.log("\nSpec lists inside tab:");
  $p('#tab-description ul li, .tab-panels .panel ul li').slice(0, 10).each((i, el) => {
    console.log("- " + $p(el).text().replace(/\s+/g, ' ').trim());
  });
}
test();
