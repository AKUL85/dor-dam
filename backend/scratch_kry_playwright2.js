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
  
  console.log("Product links found via Playwright:", [...new Set(productLinks)].length);
  console.log("Sample links:", [...new Set(productLinks)].slice(0, 5));
  
  console.log("Pagination elements:");
  let nextUrl = null;
  // KRY might use infinite scroll or load more button
  if ($('button:contains("Load More"), button:contains("Next")').length) {
    console.log("Found Load More button!");
  } else {
    $('a').each((i, el) => {
        const text = $(el).text().toLowerCase();
        if (text.includes('next') || $(el).attr('aria-label') === 'Next') {
            console.log("Next link found:", $(el).attr('href'));
            nextUrl = $(el).attr('href');
        }
    });
  }
  
  if (productLinks.length > 0) {
    console.log("Loading first product:", productLinks[0]);
    await page.goto(`https://kryinternational.com${productLinks[0]}`, { waitUntil: 'networkidle' });
    const phtml = await page.content();
    const $p = cheerio.load(phtml);
    console.log("Product Name:", $p('h1').text().trim());
    console.log("Price text:", $p('h1').parent().text().substring(0, 200).replace(/\s+/g, ' '));
  }
  
  await browser.close();
}

explore().catch(console.error);
