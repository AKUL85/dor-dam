const { chromium } = require('playwright');
const cheerio = require('cheerio');

async function explore() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://kryinternational.com/products/huawei-mate-xt-ultimate', { waitUntil: 'networkidle' });
  const phtml = await page.content();
  const $ = cheerio.load(phtml);
  
  // Find all elements that look like price
  console.log("--- All prices ---");
  const prices = [];
  $('*').each((i, el) => {
      const text = $(el).text();
      if (text.includes('৳') && text.length < 50) {
          prices.push($(el).prop('tagName') + " " + $(el).attr('class') + " : " + text);
      }
  });
  console.log([...new Set(prices)].slice(0, 10));

  console.log("\n--- Titles ---");
  // Look for the product name which is "Huawei Mate XT Ultimate"
  $('*').each((i, el) => {
      const text = $(el).text().trim();
      if (text.toLowerCase().includes('mate xt ultimate') && text.length < 50) {
          console.log($(el).prop('tagName') + " " + $(el).attr('class') + " : " + text);
      }
  });

  await browser.close();
}

explore().catch(console.error);
