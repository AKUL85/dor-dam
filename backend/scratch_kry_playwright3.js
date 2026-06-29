const { chromium } = require('playwright');
const cheerio = require('cheerio');

async function explore() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://kryinternational.com/products/huawei-mate-xt-ultimate', { waitUntil: 'networkidle' });
  const phtml = await page.content();
  const $ = cheerio.load(phtml);
  
  console.log("Name:", $('h1').text().trim());
  
  // Find prices
  console.log("\n--- Prices ---");
  $('span:contains("৳")').each((i, el) => {
    console.log($(el).text().trim());
  });
  
  // Find availability
  console.log("\n--- Availability ---");
  const text = $('body').text().toLowerCase();
  if (text.includes('out of stock')) console.log("Out of stock");
  else if (text.includes('in stock')) console.log("In stock");
  
  // Find specs
  console.log("\n--- Specs ---");
  // They might be in a table or list
  $('table tr').each((i, el) => {
     const th = $(el).find('th, td:first-child').text().trim();
     const td = $(el).find('td:last-child').text().trim();
     if (th && td) {
        console.log(`${th} : ${td}`);
     }
  });
  
  await browser.close();
}

explore().catch(console.error);
