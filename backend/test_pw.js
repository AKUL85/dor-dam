const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  const res = await page.goto('https://www.gsmarena.com/makers.php3');
  console.log('Status:', res.status());
  const title = await page.title();
  console.log('Title:', title);
  await browser.close();
})();
