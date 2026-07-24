// ─────────────────────────────────────────────────────────────
//  Catalog service — the read model powering the GSMArena-style
//  API. It loads the scraper's JSON catalog
//  (output/gsmarena-catalog-latest.json) into memory and exposes
//  query helpers: brand listing, search + filter + sort + paginate,
//  detail lookup by slug, and multi-phone compare.
//
//  The catalog is hot-reloaded when the underlying file changes, so
//  a fresh scrape is picked up without restarting the server.
// ─────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const config = require('../config/env');
const logger = require('../utils/logger').child({ scope: 'catalog' });

const CATALOG_FILENAME = 'gsmarena-catalog-latest.json';

let _cache = null; // { mtimeMs, catalog, index }

function catalogPath() {
  return path.join(config.scraper.outputDir, CATALOG_FILENAME);
}

/** Load (and memoise) the catalog, reloading when the file changes. */
function loadCatalog() {
  const file = catalogPath();
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    if (_cache) return _cache;
    logger.warn('Catalog file not found — run the GSMArena scraper first', { file });
    return { mtimeMs: 0, catalog: emptyCatalog(), index: emptyIndex() };
  }

  if (_cache && _cache.mtimeMs === stat.mtimeMs) return _cache;

  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const catalog = normaliseCatalog(raw);
  _cache = { mtimeMs: stat.mtimeMs, catalog, index: buildIndex(catalog) };
  logger.info('Catalog loaded', {
    phones: catalog.phones.length,
    brands: catalog.brands.length,
  });
  return _cache;
}

function emptyCatalog() {
  return { generatedAt: null, totalBrands: 0, totalPhones: 0, brands: [], phones: [] };
}

function emptyIndex() {
  return { bySlug: new Map(), byBrand: new Map() };
}

function normaliseCatalog(raw) {
  const phones = Array.isArray(raw.phones) ? raw.phones : [];
  const brands = Array.isArray(raw.brands) ? raw.brands : [];
  return {
    source: raw.source || 'gsmarena.com',
    generatedAt: raw.generatedAt || null,
    totalBrands: brands.length,
    totalPhones: phones.length,
    brands,
    phones,
  };
}

function buildIndex(catalog) {
  const bySlug = new Map();
  const byBrand = new Map();
  for (const p of catalog.phones) {
    if (p.slug) bySlug.set(p.slug, p);
    const key = (p.brand || '').toLowerCase();
    if (!byBrand.has(key)) byBrand.set(key, []);
    byBrand.get(key).push(p);
  }
  return { bySlug, byBrand };
}

// ── Public shape helpers ─────────────────────────────────────

/** Lightweight card representation for lists. */
function toCard(p) {
  return {
    slug: p.slug,
    brand: p.brand,
    name: p.modelName,
    image: p.imageUrl || p.thumb || null,
    releaseYear: p.releaseYear || null,
    releaseDate: p.releaseDate || null,
    status: p.status || null,
    popularity: p.popularity || null,
    priceHint: p.priceHint || null,
    keySpecs: p.keySpecs || {},
  };
}

// ── Queries ──────────────────────────────────────────────────

function getMeta() {
  const { catalog } = loadCatalog();
  return {
    source: catalog.source,
    generatedAt: catalog.generatedAt,
    totalBrands: catalog.totalBrands,
    totalPhones: catalog.totalPhones,
  };
}

function getBrands() {
  const { catalog, index } = loadCatalog();
  // Prefer brand summaries from the catalog; fall back to derived counts.
  if (catalog.brands.length) {
    return catalog.brands
      .map((b) => ({
        name: b.name,
        slug: b.slug,
        phoneCount:
          b.phoneCount ?? (index.byBrand.get((b.name || '').toLowerCase()) || []).length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return [...index.byBrand.entries()]
    .map(([name, phones]) => ({ name, slug: name, phoneCount: phones.length }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const SORTABLE = {
  popularity: (a, b) => (b.popularity || 0) - (a.popularity || 0),
  newest: (a, b) => (b.releaseYear || 0) - (a.releaseYear || 0),
  oldest: (a, b) => (a.releaseYear || 0) - (b.releaseYear || 0),
  name: (a, b) => (a.modelName || '').localeCompare(b.modelName || ''),
};

/**
 * List phones with search, filters, sorting and pagination.
 * @param {object} q
 *   { search, brand, year, minYear, sort, page, pageSize }
 */
function listPhones(q = {}) {
  const { catalog } = loadCatalog();
  let items = catalog.phones;

  const search = (q.search || '').trim().toLowerCase();
  if (search) {
    items = items.filter((p) => {
      const hay = `${p.brand} ${p.modelName}`.toLowerCase();
      return hay.includes(search);
    });
  }

  if (q.brand) {
    const brand = String(q.brand).toLowerCase();
    items = items.filter(
      (p) =>
        (p.brand || '').toLowerCase() === brand ||
        (p.slug || '').toLowerCase().startsWith(`${brand}_`)
    );
  }

  if (q.year) {
    const year = Number(q.year);
    items = items.filter((p) => p.releaseYear === year);
  }
  if (q.minYear) {
    const minYear = Number(q.minYear);
    items = items.filter((p) => (p.releaseYear || 0) >= minYear);
  }

  const sortKey = SORTABLE[q.sort] ? q.sort : 'popularity';
  items = [...items].sort(SORTABLE[sortKey]);

  const total = items.length;
  const page = Math.max(1, Number(q.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(q.pageSize) || 24));
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);

  return {
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    sort: sortKey,
    items: paged.map(toCard),
  };
}

/** Full detail for a single phone by slug. */
function getPhone(slug) {
  const { index } = loadCatalog();
  return index.bySlug.get(slug) || null;
}

/** Full details for several phones (compare), preserving input order. */
function comparePhones(slugs = []) {
  const { index } = loadCatalog();
  return slugs.map((s) => index.bySlug.get(s)).filter(Boolean);
}

/** Fast, small typeahead search over brand + model name. */
function quickSearch(qStr, limit = 8) {
  const { catalog } = loadCatalog();
  const q = (qStr || '').trim().toLowerCase();
  if (!q) return [];
  const out = [];
  for (const p of catalog.phones) {
    if (`${p.brand} ${p.modelName}`.toLowerCase().includes(q)) {
      out.push(toCard(p));
      if (out.length >= limit) break;
    }
  }
  return out;
}

module.exports = {
  getMeta,
  getBrands,
  listPhones,
  getPhone,
  comparePhones,
  quickSearch,
  // exported for tests
  _loadCatalog: loadCatalog,
};
