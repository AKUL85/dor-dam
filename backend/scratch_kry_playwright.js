const { chromium } = require('playwright');
const cheerio = require('cheerio');

async function explore() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log("Loading page...");
  await page.goto('https://kryinternational.com/products/category/phone', { waitUntil: 'networkidle' });
  
  const html = await page.content();
  const $ = cheerio.load(html);
  
  const productLinks = [];
  $('a[href^="/products/"]').each((i, el) => {
    const href = $(el).attr('href');
    if (!href.includes('/category/') && !href.includes('/brand/')) {
        productLinks.push(href);
    }
  });
  
  console.log("Product links found via Playwright:", [...new Set(productLinks)].slice(0, 15));
  
  console.log("Pagination elements:");
  $('.pagination a, .next, a:contains("Next")').each((i, el) => {
     console.log("Next link found:", $(el).attr('href'));
  });
  
  await browser.close();
}

explore().catch(console.error);
