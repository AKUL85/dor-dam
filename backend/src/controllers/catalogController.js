// ─────────────────────────────────────────────────────────────
//  Catalog controller — thin HTTP layer over the catalog service.
//  Powers the GSMArena-style browsing API.
// ─────────────────────────────────────────────────────────────
const catalog = require('../services/catalogService');
const AppError = require('../utils/AppError');

/** GET /api/catalog/meta */
function meta(_req, res) {
  res.json({ status: 'ok', meta: catalog.getMeta() });
}

/** GET /api/brands */
function brands(_req, res) {
  res.json({ status: 'ok', brands: catalog.getBrands() });
}

/** GET /api/phones?search=&brand=&year=&minYear=&sort=&page=&pageSize= */
function phones(req, res) {
  const result = catalog.listPhones({
    search: req.query.search,
    brand: req.query.brand,
    year: req.query.year,
    minYear: req.query.minYear,
    sort: req.query.sort,
    page: req.query.page,
    pageSize: req.query.pageSize,
  });
  res.json({ status: 'ok', ...result });
}

/** GET /api/phones/:slug */
function phone(req, res) {
  const found = catalog.getPhone(req.params.slug);
  if (!found) throw AppError.notFound(`Phone "${req.params.slug}" not found`);
  res.json({ status: 'ok', phone: found });
}

/** GET /api/compare?slugs=a,b,c */
function compare(req, res) {
  const slugs = String(req.query.slugs || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (slugs.length === 0) throw AppError.badRequest('Provide ?slugs=a,b,c');
  res.json({ status: 'ok', phones: catalog.comparePhones(slugs) });
}

/** GET /api/search?q= */
function search(req, res) {
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));
  res.json({ status: 'ok', results: catalog.quickSearch(req.query.q, limit) });
}

module.exports = { meta, brands, phones, phone, compare, search };
