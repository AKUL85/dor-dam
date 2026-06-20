// ─────────────────────────────────────────────────────────────
//  Transform raw scraped products into a DB-ready shape that maps
//  cleanly onto the Prisma models (Store / PhoneModel / Phone /
//  Listing). Keeping this mapping in one place means scrapers stay
//  storage-agnostic and the persistence layer stays scraper-agnostic.
// ─────────────────────────────────────────────────────────────

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** Build the unique Phone.variant_key: brand+model+version+ram+storage. */
function buildVariantKey({ brand, modelName, marketVersion, ram, storage }) {
  return [brand, modelName, marketVersion, ram, storage]
    .map((p) => slugify(p ?? 'na') || 'na')
    .join('_');
}

const asString = (value) => {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
};

/**
 * Map a single raw scraped product to normalised DB entities.
 * @returns {{ store, phoneModel, phone, listing }}
 */
function transformProduct(raw, context = {}) {
  const keySpecs = raw.keySpecs || {};
  const brand = raw.brand || context.defaultBrand || 'Unknown';
  const modelName = raw.name;
  const marketVersion = raw.marketVersion || 'official';
  const ram = asString(keySpecs.ram);
  const storage = asString(keySpecs.storage);

  return {
    store: {
      name: raw.store || context.storeName || null,
      url: raw.storeUrl || context.storeUrl || null,
    },
    phoneModel: {
      brand,
      model_name: modelName,
      category_tags: Array.isArray(raw.categoryTags) ? raw.categoryTags : [],
      image_url: raw.imageUrl || null,
      release_year: Number.isInteger(raw.releaseYear) ? raw.releaseYear : null,
    },
    phone: {
      market_version: marketVersion,
      ram,
      storage,
      chipset: asString(keySpecs.chipset),
      battery: asString(keySpecs.battery),
      camera: asString(keySpecs.camera),
      variant_key: buildVariantKey({ brand, modelName, marketVersion, ram, storage }),
    },
    listing: {
      price: typeof raw.price === 'number' ? raw.price : null,
      original_price: typeof raw.originalPrice === 'number' ? raw.originalPrice : null,
      in_stock: Boolean(raw.inStock),
      product_url: raw.productUrl || null,
      scraped_at: raw.scrapedAt ? new Date(raw.scrapedAt) : new Date(),
    },
  };
}

/**
 * Transform a full scrape result. Products missing the data required
 * to build a valid listing (name, price, product_url) are dropped and
 * reported so invalid rows never reach the database.
 */
function transformResult(result, context = {}) {
  const records = [];
  const invalid = [];

  for (const raw of result.products || []) {
    const record = transformProduct(raw, { storeName: result.store, storeUrl: result.storeUrl, ...context });
    if (!record.phoneModel.model_name || record.listing.price === null || !record.listing.product_url) {
      invalid.push({ productUrl: raw.productUrl || null, reason: 'missing name/price/url' });
      continue;
    }
    records.push(record);
  }

  return { records, invalid };
}

module.exports = { transformProduct, transformResult, buildVariantKey, slugify };
