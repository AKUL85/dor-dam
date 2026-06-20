// ─────────────────────────────────────────────────────────────
//  Prisma client singleton.
//  Lazily instantiated and degrades gracefully: if no
//  DATABASE_URL is configured or the client has not been
//  generated yet, isAvailable() returns false instead of
//  crashing the process. This keeps the API/scraper usable
//  without a database (e.g. JSON-only scraping).
// ─────────────────────────────────────────────────────────────
const config = require('../config/env');
const logger = require('../utils/logger').child({ scope: 'prisma' });

let client = null;
let initialised = false;

function getPrisma() {
  if (initialised) return client;
  initialised = true;

  if (!config.database.enabled) {
    logger.warn('DATABASE_URL not set — database features are disabled');
    return null;
  }

  try {
    // Required lazily so a missing generated client does not break boot.
    const { PrismaClient } = require('@prisma/client');
    const { PrismaPg } = require('@prisma/adapter-pg');
    // Prisma 7 connects through a driver adapter rather than a schema URL.
    const adapter = new PrismaPg({ connectionString: config.database.url });
    client = new PrismaClient({ adapter });
    logger.info('Prisma client initialised');
  } catch (err) {
    logger.error('Failed to initialise Prisma client. Run `npx prisma generate`.', {
      error: err.message,
    });
    client = null;
  }

  return client;
}

function isAvailable() {
  return getPrisma() !== null;
}

async function disconnect() {
  if (client) {
    await client.$disconnect();
    client = null;
    initialised = false;
  }
}

module.exports = { getPrisma, isAvailable, disconnect };
