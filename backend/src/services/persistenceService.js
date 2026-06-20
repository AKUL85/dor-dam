// ─────────────────────────────────────────────────────────────
//  Persistence service — writes DB-ready records (produced by the
//  product transformer) into Postgres via Prisma. Store/PhoneModel
//  rows are found-or-created, Phone variants are upserted on their
//  unique variant_key, and each scrape appends a new time-series
//  Listing row.
//
//  All persistence is guarded: when no database is configured the
//  service reports skipped=true instead of throwing.
// ─────────────────────────────────────────────────────────────
const { getPrisma, isAvailable } = require('../db/prisma');
const logger = require('../utils/logger').child({ scope: 'persistence' });

async function findOrCreateStore(prisma, store) {
  const existing = await prisma.store.findFirst({ where: { name: store.name } });
  if (existing) return existing;
  return prisma.store.create({
    data: { name: store.name, url: store.url || '' },
  });
}

async function findOrCreatePhoneModel(prisma, phoneModel) {
  const existing = await prisma.phoneModel.findFirst({
    where: { brand: phoneModel.brand, model_name: phoneModel.model_name },
  });
  if (existing) return existing;
  return prisma.phoneModel.create({ data: phoneModel });
}

async function upsertPhone(prisma, phone, modelId) {
  return prisma.phone.upsert({
    where: { variant_key: phone.variant_key },
    update: {
      ram: phone.ram ?? '',
      storage: phone.storage ?? '',
      chipset: phone.chipset ?? '',
      battery: phone.battery ?? '',
      camera: phone.camera ?? '',
    },
    create: {
      model_id: modelId,
      market_version: phone.market_version,
      ram: phone.ram ?? '',
      storage: phone.storage ?? '',
      chipset: phone.chipset ?? '',
      battery: phone.battery ?? '',
      camera: phone.camera ?? '',
      variant_key: phone.variant_key,
    },
  });
}

/**
 * Persist transformed records. Each record is written in its own
 * transaction so one bad row cannot abort the whole batch.
 * @param {Array} records output of transformResult().records
 */
async function persistRecords(records) {
  if (!isAvailable()) {
    logger.warn('Skipping persistence — database not configured');
    return { skipped: true, created: 0, failed: 0, total: records.length };
  }

  const prisma = getPrisma();
  let created = 0;
  let failed = 0;

  for (const record of records) {
    try {
      await prisma.$transaction(async (tx) => {
        const store = await findOrCreateStore(tx, record.store);
        const phoneModel = await findOrCreatePhoneModel(tx, record.phoneModel);
        const phone = await upsertPhone(tx, record.phone, phoneModel.id);

        await tx.listing.create({
          data: {
            phone_id: phone.id,
            store_id: store.id,
            price: record.listing.price,
            original_price: record.listing.original_price,
            in_stock: record.listing.in_stock,
            product_url: record.listing.product_url,
            scraped_at: record.listing.scraped_at,
          },
        });
      });
      created += 1;
    } catch (err) {
      failed += 1;
      logger.error('Failed to persist record', {
        productUrl: record.listing.product_url,
        error: err.message,
      });
    }
  }

  logger.info('Persistence complete', { created, failed, total: records.length });
  return { skipped: false, created, failed, total: records.length };
}

module.exports = { persistRecords };
