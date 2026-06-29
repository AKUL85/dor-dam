const axios = require('axios');
const cheerio = require('cheerio');
async function test() {
  const prodRes = await axios.get('https://diamu.com.bd/product/nothing-phone-3a-lite/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const $p = cheerio.load(prodRes.data);
  console.log($p('.product-short-description').html());
}
test();
