const { createScraper } = require('./src/scraper/registry');

const mockLogger = {
  info: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.log
};

async function test() {
  try {
    const scraper = createScraper('diamu', { log: mockLogger });
    const result = await scraper.run();
    console.log(`Found ${result.totalFound} products.`);
    if (result.products.length > 0) {
      console.log('Sample product:', JSON.stringify(result.products[0], null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
