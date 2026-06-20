#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
//  CLI runner for scrapers (replaces ad-hoc standalone scripts).
//
//  Usage:
//    node src/cli.js list
//    node src/cli.js star-tech [--persist] [--no-save] [--max-pages=5]
//    node src/cli.js all [--persist]
// ─────────────────────────────────────────────────────────────
const logger = require('./utils/logger').child({ scope: 'cli' });
const scraperService = require('./services/scraperService');
const { disconnect } = require('./db/prisma');

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      flags[key] = value === undefined ? true : value;
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const target = positional[0];

  if (!target || target === 'list') {
    logger.info('Available stores', { stores: scraperService.getAvailableStores() });
    return;
  }

  const overrides = {};
  if (flags['max-pages']) overrides.maxPages = parseInt(flags['max-pages'], 10);
  if (flags['delay-ms']) overrides.delayMs = parseInt(flags['delay-ms'], 10);
  if (flags.headed) overrides.headless = false;

  const options = {
    persist: Boolean(flags.persist),
    saveToDisk: flags['no-save'] ? false : undefined,
    overrides,
  };

  if (target === 'all') {
    const results = await scraperService.scrapeStores([], options);
    logger.info('All scrapes finished', {
      stores: results.map((r) => ({ store: r.store, found: r.summary?.totalFound, error: r.error })),
    });
    return;
  }

  const result = await scraperService.scrapeStore(target, options);
  logger.info('Scrape finished', { store: result.store, summary: result.summary, persistence: result.persistence });
}

main()
  .catch((err) => {
    logger.error('CLI run failed', { error: err.message, stack: err.stack });
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnect();
  });
