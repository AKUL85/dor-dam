#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
//  CLI runner for the GSMArena catalog scraper.
//
//  Usage:
//    node src/gsmarena-cli.js                       # full catalog (all brands)
//    node src/gsmarena-cli.js --brands=apple,samsung
//    node src/gsmarena-cli.js --brands=apple --max-models=5
//    node src/gsmarena-cli.js --max-brands=3 --no-cache
//    node src/gsmarena-cli.js --delay-ms=2000
// ─────────────────────────────────────────────────────────────
const logger = require('./utils/logger').child({ scope: 'gsmarena-cli' });
const GsmArenaScraper = require('./scraper/gsmarena/GsmArenaScraper');

function parseArgs(argv) {
  const flags = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, value] = arg.slice(2).split('=');
    flags[key] = value === undefined ? true : value;
  }
  return flags;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));

  const options = {};
  if (flags.brands) options.brands = String(flags.brands).split(',').map((s) => s.trim());
  if (flags['max-brands']) options.maxBrands = parseInt(flags['max-brands'], 10);
  if (flags['max-models']) options.maxModelsPerBrand = parseInt(flags['max-models'], 10);
  if (flags['max-pages']) options.maxPagesPerBrand = parseInt(flags['max-pages'], 10);
  if (flags['delay-ms']) options.delayMs = parseInt(flags['delay-ms'], 10);
  if (flags['no-cache']) options.useCache = false;
  if (flags['include-all']) options.phonesOnly = false;

  const scraper = new GsmArenaScraper(options);
  const catalog = await scraper.run();
  const savedTo = scraper.saveCatalog(catalog);

  logger.info('GSMArena catalog finished', {
    brands: catalog.totalBrands,
    phones: catalog.totalPhones,
    errors: catalog.totalErrors,
    savedTo,
  });
}

main().catch((err) => {
  logger.error('GSMArena CLI failed', { error: err.message, stack: err.stack });
  process.exitCode = 1;
});
