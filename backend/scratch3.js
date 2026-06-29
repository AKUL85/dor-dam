const axios = require('axios');
const cheerio = require('cheerio');
async function test() {
  const prodRes = await axios.get('https://diamu.com.bd/product/nothing-phone-3a-lite/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const $p = cheerio.load(prodRes.data);
  let tableCount = 0;
  $p('table').each((i, table) => {
    tableCount++;
    console.log(`\nTable ${tableCount}:`, $p(table).attr('class') || 'no-class');
    $p(table).find('tr').slice(0,3).each((j, tr) => {
      console.log(' - ' + $p(tr).text().replace(/\s+/g, ' ').trim());
    });
  });
}
test();
